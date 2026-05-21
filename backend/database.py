"""Banco de dados SQLite - Painel Aviator
Mudancas em relacao a versao antiga:
  1. Master criado a partir de variaveis de ambiente (MASTER_EMAIL / MASTER_SENHA),
     nunca mais hardcoded no codigo.
  2. Removido o bloco seed_clientes (clientes de teste com senha em texto puro).
     Os clientes reais sao criados pelo proprio painel master.
  3. Mantida toda a estrutura de tabelas e funcoes da versao original.

ATENCAO: SQLite no Render e apagado a cada deploy/reinicio. Para producao
com clientes reais, migrar para Postgres.
"""
import sqlite3
import os
import uuid
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash

DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'aviator.db')


def get_db():
    """Retorna conexao com o banco"""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    """Cria as tabelas e o master a partir das variaveis de ambiente"""
    conn = get_db()
    cursor = conn.cursor()

    cursor.executescript('''
        CREATE TABLE IF NOT EXISTS master (
            id INTEGER PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            senha_hash TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY,
            token TEXT UNIQUE NOT NULL,
            login TEXT UNIQUE NOT NULL,
            senha_hash TEXT NOT NULL,
            nome TEXT DEFAULT '',
            observacao TEXT DEFAULT '',
            bloqueado INTEGER DEFAULT 0,
            tempo_acesso INTEGER DEFAULT 0,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ultimo_acesso TIMESTAMP,
            online INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS rodadas (
            id INTEGER PRIMARY KEY,
            painel INTEGER DEFAULT 1,
            rodada TEXT NOT NULL,
            multiplicador REAL NOT NULL,
            timestamp TEXT DEFAULT '',
            soma INTEGER DEFAULT 0,
            cor TEXT DEFAULT 'azul',
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(painel, rodada)
        );

        CREATE INDEX IF NOT EXISTS idx_rodadas_painel
            ON rodadas(painel, id DESC);
    ''')

    # ===== MASTER via variavel de ambiente =====
    # Configure MASTER_EMAIL e MASTER_SENHA no painel do Render.
    # Sem essas variaveis, nenhum master e criado (e o login nao funciona).
    master_email = os.environ.get('MASTER_EMAIL')
    master_senha = os.environ.get('MASTER_SENHA')

    if master_email and master_senha:
        existe = cursor.execute(
            "SELECT id FROM master WHERE email = ?", (master_email,)
        ).fetchone()
        senha_hash = generate_password_hash(master_senha)
        if not existe:
            cursor.execute(
                "INSERT INTO master (email, senha_hash) VALUES (?, ?)",
                (master_email, senha_hash)
            )
        else:
            # Permite trocar a senha so mudando a env var no Render
            cursor.execute(
                "UPDATE master SET senha_hash = ? WHERE email = ?",
                (senha_hash, master_email)
            )
    else:
        print("[AVISO] MASTER_EMAIL/MASTER_SENHA nao configurados. "
              "Configure no Render para o login master funcionar.")

    # Migracao: adiciona coluna slug se nao existir
    try:
        cursor.execute("ALTER TABLE clientes ADD COLUMN slug TEXT DEFAULT NULL")
    except sqlite3.OperationalError:
        pass  # Coluna ja existe

    # Indice unico para slug (operacao separada do ADD COLUMN)
    try:
        cursor.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_slug ON clientes(slug)"
        )
    except sqlite3.OperationalError:
        pass

    conn.commit()
    conn.close()


# ===== MASTER =====
def verificar_master(email, senha):
    conn = get_db()
    master = conn.execute(
        "SELECT * FROM master WHERE email = ?", (email,)
    ).fetchone()
    conn.close()
    if master and check_password_hash(master['senha_hash'], senha):
        return dict(master)
    return None


# ===== CLIENTES =====
def criar_cliente(login, senha, nome="", observacao="", tempo_acesso=0, slug=None):
    conn = get_db()
    token = str(uuid.uuid4())
    hash_senha = generate_password_hash(senha)
    try:
        if slug:
            conn.execute(
                """INSERT INTO clientes
                   (token, login, senha_hash, nome, observacao, tempo_acesso, slug)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (token, login, hash_senha, nome, observacao, tempo_acesso, slug)
            )
        else:
            conn.execute(
                """INSERT INTO clientes
                   (token, login, senha_hash, nome, observacao, tempo_acesso)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (token, login, hash_senha, nome, observacao, tempo_acesso)
            )
        conn.commit()
        return {"ok": True, "token": token, "slug": slug}
    except sqlite3.IntegrityError as e:
        if "slug" in str(e):
            return {"ok": False, "erro": "Slug ja esta em uso"}
        return {"ok": False, "erro": "Login ja existe"}
    finally:
        conn.close()


def listar_clientes():
    conn = get_db()
    rows = conn.execute(
        """SELECT id, token, login, nome, observacao, bloqueado,
                  tempo_acesso, criado_em, ultimo_acesso, online, slug
           FROM clientes ORDER BY criado_em DESC"""
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_cliente_por_id(cliente_id):
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM clientes WHERE id = ?", (cliente_id,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def get_cliente_por_token(token):
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM clientes WHERE token = ?", (token,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def get_cliente_por_slug(slug):
    """Busca cliente por slug (link personalizado)"""
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM clientes WHERE slug = ?", (slug,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def get_cliente_por_login(login):
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM clientes WHERE login = ?", (login,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def atualizar_slug(cliente_id, slug):
    """Atualiza slug de um cliente"""
    conn = get_db()
    try:
        conn.execute(
            "UPDATE clientes SET slug = ? WHERE id = ?", (slug, cliente_id)
        )
        conn.commit()
        conn.close()
        return {"ok": True}
    except sqlite3.IntegrityError:
        conn.close()
        return {"ok": False, "erro": "Slug ja esta em uso"}


def verificar_cliente(login, senha):
    cliente = get_cliente_por_login(login)
    if cliente and not cliente['bloqueado'] and check_password_hash(
            cliente['senha_hash'], senha):
        if not verificar_tempo_acesso(cliente):
            return None, "Acesso expirado"
        return cliente, None
    if cliente and cliente['bloqueado']:
        return None, "Conta bloqueada"
    return None, "Login ou senha invalidos"


def verificar_tempo_acesso(cliente):
    """Retorna True se o acesso ainda e valido"""
    if cliente['tempo_acesso'] == 0:
        return True  # Ilimitado
    if not cliente['ultimo_acesso']:
        return True  # Primeiro acesso, deixa passar
    ultimo = datetime.fromisoformat(cliente['ultimo_acesso'])
    expira = ultimo + timedelta(minutes=cliente['tempo_acesso'])
    return datetime.now() < expira


def editar_cliente(cliente_id, dados):
    conn = get_db()
    updates = []
    valores = []
    for campo in ['login', 'nome', 'observacao', 'tempo_acesso', 'slug']:
        if campo in dados:
            updates.append(f"{campo} = ?")
            valores.append(dados[campo])
    if 'senha' in dados and dados['senha']:
        updates.append("senha_hash = ?")
        valores.append(generate_password_hash(dados['senha']))
    if updates:
        valores.append(cliente_id)
        try:
            conn.execute(
                f"UPDATE clientes SET {', '.join(updates)} WHERE id = ?",
                valores
            )
            conn.commit()
            conn.close()
            return {"ok": True}
        except sqlite3.IntegrityError:
            conn.close()
            return {"ok": False, "erro": "Slug ja esta em uso"}
    conn.close()
    return {"ok": True}


def toggle_bloqueio(cliente_id):
    conn = get_db()
    cliente = conn.execute(
        "SELECT bloqueado FROM clientes WHERE id = ?", (cliente_id,)
    ).fetchone()
    if cliente:
        novo = 0 if cliente['bloqueado'] else 1
        conn.execute(
            "UPDATE clientes SET bloqueado = ? WHERE id = ?",
            (novo, cliente_id)
        )
        conn.commit()
        conn.close()
        return {"bloqueado": bool(novo)}
    conn.close()
    return None


def atualizar_online(cliente_id, online=True):
    conn = get_db()
    agora = datetime.now().isoformat()
    conn.execute(
        "UPDATE clientes SET online = ?, ultimo_acesso = ? WHERE id = ?",
        (1 if online else 0, agora, cliente_id)
    )
    conn.commit()
    conn.close()


def excluir_cliente_db(cliente_id):
    conn = get_db()
    try:
        conn.execute("DELETE FROM clientes WHERE id = ?", (cliente_id,))
        conn.commit()
        conn.close()
        return True
    except Exception:
        conn.close()
        return False


def get_estatisticas():
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) FROM clientes").fetchone()[0]
    ativos = conn.execute(
        "SELECT COUNT(*) FROM clientes WHERE bloqueado = 0"
    ).fetchone()[0]
    bloqueados = conn.execute(
        "SELECT COUNT(*) FROM clientes WHERE bloqueado = 1"
    ).fetchone()[0]
    online = conn.execute(
        "SELECT COUNT(*) FROM clientes WHERE online = 1"
    ).fetchone()[0]
    conn.close()
    return {
        "total": total,
        "ativos": ativos,
        "bloqueados": bloqueados,
        "online": online
    }


def exportar_relatorio():
    """Retorna dados para CSV"""
    clientes = listar_clientes()
    linhas = []
    for c in clientes:
        status = "Ativo" if not c['bloqueado'] else "Bloqueado"
        online = "Sim" if c['online'] else "Nao"
        linhas.append({
            "Nome": c['nome'],
            "Login": c['login'],
            "Observacao": c['observacao'],
            "Status": status,
            "Online": online,
            "Ultimo Acesso": c['ultimo_acesso'] or "Nunca",
            "Criado em": c['criado_em']
        })
    return linhas


# ===== HISTORICO DE RODADAS =====
def _calcular_soma(mult):
    """Soma dos digitos do multiplicador. Ex: 5.65 -> 5+6+5 = 16"""
    soma = 0
    for ch in f"{mult:.2f}":
        if ch.isdigit():
            soma += int(ch)
    return soma


def _classificar_cor(mult):
    """azul ate 1.99, roxa ate 9.99, rosa de 10 pra cima"""
    if mult < 2.0:
        return 'azul'
    if mult < 10.0:
        return 'roxa'
    return 'rosa'


def salvar_rodada(painel, rodada, multiplicador, timestamp=''):
    """Grava uma vela no historico. Ignora duplicada (mesmo painel+rodada)."""
    try:
        mult = float(multiplicador)
    except (ValueError, TypeError):
        return {"ok": False, "erro": "Multiplicador invalido"}
    if mult < 1.0:
        return {"ok": False, "erro": "Multiplicador fora da faixa"}

    soma = _calcular_soma(mult)
    cor = _classificar_cor(mult)
    conn = get_db()
    try:
        conn.execute(
            """INSERT INTO rodadas
               (painel, rodada, multiplicador, timestamp, soma, cor)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (int(painel), str(rodada), round(mult, 2),
             str(timestamp), soma, cor)
        )
        conn.commit()
        return {"ok": True, "soma": soma, "cor": cor}
    except sqlite3.IntegrityError:
        # Rodada ja existe nesse painel - duplicada, ignora sem erro
        return {"ok": True, "duplicada": True}
    finally:
        conn.close()


def listar_rodadas(painel=1, limite=100):
    """Retorna as ultimas N velas de um painel, mais recentes primeiro."""
    conn = get_db()
    rows = conn.execute(
        """SELECT rodada, multiplicador, timestamp, soma, cor, criado_em
           FROM rodadas WHERE painel = ?
           ORDER BY id DESC LIMIT ?""",
        (int(painel), int(limite))
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def contar_rodadas(painel=1):
    """Total de velas registradas em um painel."""
    conn = get_db()
    n = conn.execute(
        "SELECT COUNT(*) FROM rodadas WHERE painel = ?", (int(painel),)
    ).fetchone()[0]
    conn.close()
    return n


# ===== ESTATISTICA DESCRITIVA DO HISTORICO =====
# Mostra o que JA aconteceu. Nao preve rodada futura.
def estatistica_painel(painel=1):
    """Retorna estatistica descritiva das velas de um painel.
    Tudo aqui descreve o passado - nao ha previsao."""
    velas = listar_rodadas(painel, 5000)
    if not velas:
        return {"total": 0}

    mults = [v['multiplicador'] for v in velas]
    total = len(mults)
    azul = sum(1 for m in mults if m < 2.0)
    roxa = sum(1 for m in mults if 2.0 <= m < 10.0)
    rosa = sum(1 for m in mults if m >= 10.0)

    # Maior intervalo (seca) entre velas rosa - fato passado
    seca_atual = 0
    maior_seca = 0
    for v in reversed(velas):  # do mais antigo ao mais novo
        if v['multiplicador'] >= 10.0:
            maior_seca = max(maior_seca, seca_atual)
            seca_atual = 0
        else:
            seca_atual += 1
    seca_desde_ultima_rosa = seca_atual

    # Tendencia: ultimas 50 velas
    ult = velas[:50]
    t_total = len(ult)
    t_rosa = sum(1 for v in ult if v['multiplicador'] >= 10.0)
    t_roxa = sum(1 for v in ult if 2.0 <= v['multiplicador'] < 10.0)
    t_azul = sum(1 for v in ult if v['multiplicador'] < 2.0)

    # Minutagem: agrupa por minuto do timestamp (HH:MM:SS -> MM)
    minutos = {}
    for v in velas:
        ts = v.get('timestamp') or ''
        partes = ts.split(':')
        if len(partes) >= 2:
            mm = partes[1]
        else:
            continue
        if mm not in minutos:
            minutos[mm] = {"qtd": 0, "soma_mult": 0.0, "maior": 0.0,
                           "azul": 0, "roxa": 0, "rosa": 0}
        d = minutos[mm]
        d["qtd"] += 1
        d["soma_mult"] += v['multiplicador']
        d["maior"] = max(d["maior"], v['multiplicador'])
        if v['multiplicador'] < 2.0:
            d["azul"] += 1
        elif v['multiplicador'] < 10.0:
            d["roxa"] += 1
        else:
            d["rosa"] += 1

    tabela_minutos = []
    for mm, d in sorted(minutos.items()):
        tabela_minutos.append({
            "minuto": mm,
            "qtd": d["qtd"],
            "media": round(d["soma_mult"] / d["qtd"], 2),
            "maior": round(d["maior"], 2),
            "azul": d["azul"],
            "roxa": d["roxa"],
            "rosa": d["rosa"]
        })

    # Intervalo medio entre velas rosa - distancia media de uma rosa a outra
    indices_rosa = [i for i, v in enumerate(velas) if v['multiplicador'] >= 10.0]
    if len(indices_rosa) >= 2:
        distancias = [indices_rosa[i] - indices_rosa[i - 1]
                      for i in range(1, len(indices_rosa))]
        intervalo_medio_rosa = round(sum(distancias) / len(distancias), 1)
    else:
        intervalo_medio_rosa = None

    # Streak atual: quantas velas seguidas da mesma cor vieram por ultimo
    def _cor(m):
        if m < 2.0:
            return 'azul'
        if m < 10.0:
            return 'roxa'
        return 'rosa'
    streak_atual = 0
    streak_cor = None
    if velas:
        streak_cor = _cor(velas[0]['multiplicador'])
        for v in velas:
            if _cor(v['multiplicador']) == streak_cor:
                streak_atual += 1
            else:
                break

    return {
        "total": total,
        "media_geral": round(sum(mults) / total, 2),
        "maior_geral": round(max(mults), 2),
        "distribuicao": {
            "azul": round(azul / total * 100, 1),
            "roxa": round(roxa / total * 100, 1),
            "rosa": round(rosa / total * 100, 1)
        },
        "maior_seca_rosa": maior_seca,
        "seca_desde_ultima_rosa": seca_desde_ultima_rosa,
        "intervalo_medio_rosa": intervalo_medio_rosa,
        "streak_atual": streak_atual,
        "streak_cor": streak_cor,
        "tendencia_ult50": {
            "azul": round(t_azul / t_total * 100, 1) if t_total else 0,
            "roxa": round(t_roxa / t_total * 100, 1) if t_total else 0,
            "rosa": round(t_rosa / t_total * 100, 1) if t_total else 0
        },
        "minutagem": tabela_minutos
    }
