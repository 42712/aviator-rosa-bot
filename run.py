import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from server import app, socketio, collector
import config

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    print(f"Painel Aviator SaaS Iniciado - Porta {port}")
    collector.iniciar()
    socketio.run(app, host="0.0.0.0", port=port)
