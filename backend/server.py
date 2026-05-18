import json
from flask import Flask, render_template, request, jsonify, Response
from flask_cors import CORS
from datetime import datetime
from models import db, MultiplicadorRodada
import threading

app = Flask(__name__, template_folder='../dash', static_folder='../dash/static')
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///rodadas.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# Cache
ultima_rodada = None
clientes_sse = []

def calcular_soma(valor):
    try:
        num = float(valor)
        inteiro = int(num)
        return sum(int(d) for d in str(inteiro) if d.isdigit())
    except:
        return 0

@app.route('/painel/<uuid>')
def dashboard(uuid):
    return render_template('index.html', uuid=uuid)

@app.route('/api/ultima-rodada/<uuid>')
def ultima_rodada_api(uuid):
    rodada = MultiplicadorRodada.query.order_by(MultiplicadorRodada.id.desc()).first()
    if rodada:
        return jsonify({
            'multiplicador': rodada.multiplicador,
            'rodada_id': rodada.rodada_id,
            'horario': rodada.horario.strftime('%H:%M:%S') if rodada.horario else '--:--:--',
            'soma': calcular_soma(rodada.multiplicador)
        })
    return jsonify({'multiplicador': None})

@app.route('/api/historico/<uuid>')
def historico_api(uuid):
    rodadas = MultiplicadorRodada.query.order_by(MultiplicadorRodada.id.desc()).limit(50).all()
    return jsonify([{
        'multiplicador': r.multiplicador,
        'rodada_id': r.rodada_id,
        'horario': r.horario.strftime('%H:%M:%S') if r.horario else '--:--:--',
        'soma': calcular_soma(r.multiplicador)
    } for r in rodadas])

@app.route('/api/webhook', methods=['POST'])
def webhook():
    global ultima_rodada
    data = request.json
    print(f"📥 Webhook: {data}")
    
    try:
        mult = str(data.get('multiplicador', '')).replace('x', '')
        rodada_id = data.get('rodada_id')
        
        if mult and rodada_id:
            nova = MultiplicadorRodada(
                multiplicador=mult,
                rodada_id=rodada_id,
                horario=datetime.now()
            )
            db.session.add(nova)
            db.session.commit()
            
            nova_dict = {
                'multiplicador': mult,
                'rodada_id': rodada_id,
                'horario': datetime.now().strftime('%H:%M:%S'),
                'soma': calcular_soma(mult)
            }
            ultima_rodada = nova_dict
            
            # Notifica todos clientes SSE
            dados = f"data: {json.dumps({'tipo': 'nova_rodada', 'rodada': nova_dict})}\n\n"
            for cliente in clientes_sse[:]:
                try:
                    cliente.put(dados)
                except:
                    if cliente in clientes_sse:
                        clientes_sse.remove(cliente)
            
            return jsonify({'status': 'ok'})
    except Exception as e:
        print(f"Erro: {e}")
        db.session.rollback()
    
    return jsonify({'status': 'ok'})

@app.route('/api/stream')
def stream():
    from queue import Queue
    q = Queue()
    clientes_sse.append(q)
    
    def gerar():
        try:
            yield f"data: {json.dumps({'tipo': 'conectado'})}\n\n"
            while True:
                dados = q.get(timeout=30)
                yield dados
        except:
            pass
        finally:
            if q in clientes_sse:
                clientes_sse.remove(q)
    
    return Response(gerar(), mimetype='text/event-stream', headers={
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no'
    })

with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, threaded=True)
