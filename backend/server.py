"""Servidor Flask - Painel Aviator
Rotas: login master, gerenciamento de clientes, painel do cliente,
webhook para receber velas, e API de historico.
"""
import os
import io
import csv
from flask import (Flask, render_template, jsonify, request,
                   redirect, session, Response)
from flask_cors import CORS

import config
from database import (init_db, criar_cliente, listar_clientes,
                      get_cliente_por_id, get_cliente_por_token,
                      get_cliente_por_slug, editar_cliente, toggle_bloqueio,
                      atualizar_slug, get_estatisticas, exportar_relatorio,
                      excluir_cliente_db, salvar_rodada, listar_rodadas,
                      contar_rodadas, estatistica_painel)
from auth import (login_master, login_cliente, logout,
                  master_required, cliente_required)

app = Flask(
    __name__,
    static_folder=os.path.join(os.path.dirname(os.path.dirname(__file__)),
                               'static'),
    template_folder=os.path.join(os.path.dirname(os.path.dirname(__file__)),
                                 'templates')
)
def _obter_secret_key():
    """Pega a SECRET_KEY da variavel de ambiente. Se nao houver, gera uma
    e guarda em arquivo, para os logins nao cairem a cada reinicio.
    O usuario nao precisa configurar nada - funciona sozinho."""
    chave_env = os.environ.get('SECRET_KEY')
    if chave_env:
        return chave_env
    caminho = os.path.join(os.path.dirname(__file__), 'data', '.secret_key')
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    if os.path.exists(caminho):
        with open(caminho, 'r') as f:
            return f.read().strip()
    nova = os.urandom(32).hex()
    with open(caminho, 'w') as f:
        f.write(nova)
    return nova


app.config['SECRET_KEY'] = _obter_secret_key()
app.config['SESSION_PERMANENT'] = True
CORS(app, supports_credentials=True)

init_db()


# ===================== HOME / LOGIN MASTER =====================
@app.route('/')
def home():
    if session.get('tipo') == 'master':
        return redirect('/admin')
    return redirect('/login')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email', '').strip()
        senha = request.form.get('senha', '')
        if login_master(email, senha):
            return redirect('/admin')
        return render_template('login.html', erro="Email ou senha invalidos")
    return render_template('login.html')


@app.route('/logout')
def fazer_logout():
    logout()
    return redirect('/login')


# ===================== ADMIN (MASTER) =====================
@app.route('/admin')
@master_required
def admin_dashboard():
    stats = get_estatisticas()
    return render_template('admin/dashboard.html', stats=stats)


@app.route('/admin/clientes')
@master_required
def admin_clientes():
    return render_template('admin/clientes.html', clientes=listar_clientes())


@app.route('/admin/clientes/criar', methods=['POST'])
@master_required
def admin_criar_cliente():
    login_val = request.form.get('login', '').strip()
    senha = request.form.get('senha', '')
    nome = request.form.get('nome', '').strip()
    observacao = request.form.get('observacao', '').strip()
    tempo_valor = int(request.form.get('tempo_valor', 0) or 0)
    tempo_unidade = request.form.get('tempo_unidade', 'minutos')
    fatores = {'minutos': 1, 'horas': 60, 'dias': 1440}
    tempo = tempo_valor * fatores.get(tempo_unidade, 1)
    slug = request.form.get('slug', '').strip() or None

    if not login_val or not senha:
        return render_template('admin/clientes.html',
                               erro="Login e senha sao obrigatorios",
                               clientes=listar_clientes())

    resultado = criar_cliente(login_val, senha, nome, observacao, tempo, slug)
    if resultado['ok']:
        return redirect('/admin/clientes')
    return render_template('admin/clientes.html', erro=resultado['erro'],
                           clientes=listar_clientes())


@app.route('/admin/clientes/<int:id>/editar', methods=['POST'])
@master_required
def admin_editar_cliente(id):
    dados = {}
    for campo in ['login', 'nome', 'observacao']:
        val = request.form.get(campo)
        if val is not None:
            dados[campo] = val.strip()
    tempo_valor = request.form.get('tempo_valor')
    tempo_unidade = request.form.get('tempo_unidade', 'minutos')
    if tempo_valor is not None:
        fatores = {'minutos': 1, 'horas': 60, 'dias': 1440}
        dados['tempo_acesso'] = int(tempo_valor or 0) * \
            fatores.get(tempo_unidade, 1)
    senha = request.form.get('senha')
    if senha:
        dados['senha'] = senha
    slug = request.form.get('slug')
    if slug is not None:
        dados['slug'] = slug.strip() or None
    editar_cliente(id, dados)
    return redirect('/admin/clientes')


@app.route('/admin/clientes/<int:id>/bloquear', methods=['POST'])
@master_required
def admin_bloquear_cliente(id):
    toggle_bloqueio(id)
    return redirect('/admin/clientes')


@app.route('/admin/clientes/<int:id>/slug', methods=['POST'])
@master_required
def admin_alterar_slug(id):
    slug = request.form.get('slug', '').strip() or None
    resultado = atualizar_slug(id, slug)
    if not resultado['ok']:
        return render_template('admin/clientes.html', erro=resultado['erro'],
                               clientes=listar_clientes())
    return redirect('/admin/clientes')


@app.route('/admin/clientes/<int:id>/excluir', methods=['POST'])
@master_required
def admin_excluir_cliente(id):
    excluir_cliente_db(id)
    return redirect('/admin/clientes')


@app.route('/admin/relatorios')
@master_required
def admin_relatorios():
    return render_template('admin/relatorios.html', clientes=listar_clientes())


@app.route('/admin/relatorios/exportar')
@master_required
def admin_exportar_csv():
    dados = exportar_relatorio()
    output = io.StringIO()
    if dados:
        writer = csv.DictWriter(output, fieldnames=dados[0].keys())
        writer.writeheader()
        writer.writerows(dados)
    csv_content = output.getvalue()
    output.close()
    return Response(csv_content, mimetype='text/csv',
                    headers={"Content-disposition":
                             "attachment; filename=relatorio_clientes.csv"})


# ===================== PAINEL DO CLIENTE =====================
@app.route('/painel/<slug>')
def cliente_login(slug):
    cliente = get_cliente_por_slug(slug) or get_cliente_por_token(slug)
    if not cliente:
        return "Link invalido", 404
    token = cliente['token']
    if session.get('tipo') == 'cliente' and \
            session.get('cliente_token') == token:
        return redirect(f'/painel/{token}/dash')
    return render_template('cliente/login.html', token=token, erro=None)


@app.route('/painel/<token>/entrar', methods=['POST'])
def cliente_autenticar(token):
    cliente = get_cliente_por_token(token)
    if not cliente:
        return "Link invalido", 404
    login_val = request.form.get('login', '').strip()
    senha = request.form.get('senha', '')
    sucesso, erro = login_cliente(login_val, senha)
    if sucesso:
        return redirect(f'/painel/{token}/dash')
    return render_template('cliente/login.html', token=token, erro=erro)


@app.route('/painel/<token>/dash')
@cliente_required
def cliente_dashboard(token):
    cliente = get_cliente_por_token(token)
    if not cliente:
        return redirect('/login')
    return render_template('cliente/painel.html', cliente=cliente)


@app.route('/painel/<token>/estatistica')
@cliente_required
def cliente_estatistica(token):
    cliente = get_cliente_por_token(token)
    if not cliente:
        return redirect('/login')
    return render_template('cliente/estatistica.html', cliente=cliente)


@app.route('/painel/<token>/sair')
def cliente_sair(token):
    logout()
    return redirect(f'/painel/{token}')


# ===================== WEBHOOK - RECEBE VELAS =====================
@app.route('/api/ping', methods=['GET', 'POST'])
def api_ping():
    return jsonify({"ok": True, "status": "pong"})


@app.route('/api/webhook', methods=['POST'])
def api_webhook():
    """Recebe velas da extensao e grava no historico.
    Aceita: {"painel": 1, "rodadas": [{"rodada": "...",
             "multiplicador": 5.65, "timestamp": "20:34:21"}]}
    """
    try:
        dados = request.get_json(silent=True)
        if not dados:
            return jsonify({"erro": "Dados invalidos"}), 400

        if dados.get('status') == 'online':
            return jsonify({"ok": True, "status": "online_recebido"})

        rodadas = dados.get('rodadas', [])
        painel = dados.get('painel') or dados.get('aviator', 1)
        try:
            painel = int(painel)
        except (ValueError, TypeError):
            painel = 1
        if painel not in (1, 2):
            painel = 1

        salvas = 0
        for r in rodadas:
            rodada_id = (r.get('rodada') or r.get('id') or
                         r.get('round'))
            mult = (r.get('multiplicador') or r.get('mult') or
                    r.get('multiplier') or r.get('value'))
            ts = (r.get('timestamp') or r.get('time') or
                  r.get('hora') or '')
            if rodada_id is None or mult is None:
                continue
            res = salvar_rodada(painel, rodada_id, mult, ts)
            if res.get('ok') and not res.get('duplicada'):
                salvas += 1

        return jsonify({"ok": True, "rodadas_recebidas": len(rodadas),
                        "rodadas_salvas": salvas, "painel": painel})
    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@app.route('/api/webhook/status')
def api_webhook_status():
    return jsonify({
        "aviator1_rodadas": contar_rodadas(1),
        "aviator2_rodadas": contar_rodadas(2),
        "total": contar_rodadas(1) + contar_rodadas(2)
    })


# ===================== API HISTORICO =====================
@app.route('/api/<int:painel>/historico')
def api_historico(painel):
    if painel not in (1, 2):
        return jsonify({"erro": "Painel invalido"}), 400
    return jsonify(listar_rodadas(painel, config.MAX_HISTORICO))


@app.route('/api/<int:painel>/ultimas')
def api_ultimas(painel):
    if painel not in (1, 2):
        return jsonify({"erro": "Painel invalido"}), 400
    return jsonify(listar_rodadas(painel, 50))


@app.route('/api/historico')
def api_historico_geral():
    return jsonify({
        "aviator1": listar_rodadas(1, config.MAX_HISTORICO),
        "aviator2": listar_rodadas(2, config.MAX_HISTORICO)
    })


@app.route('/api/<int:painel>/estatistica')
def api_estatistica(painel):
    """Estatistica descritiva do historico. Descreve o passado, nao preve."""
    if painel not in (1, 2):
        return jsonify({"erro": "Painel invalido"}), 400
    return jsonify(estatistica_painel(painel))


@app.route('/status')
def status_page():
    return jsonify({
        "servidor": "online",
        "aviator1": contar_rodadas(1),
        "aviator2": contar_rodadas(2)
    })


if __name__ == '__main__':
    from waitress import serve
    serve(app, host=config.HOST, port=config.PORT)
