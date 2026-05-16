"""Entrypoint WSGI para o Render - sem conflito de nome com backend/server.py"""
import os, sys

backend = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend)

from server import app, socketio, collector

collector.iniciar()

# Exporta o socketio como aplicação WSGI para o gunicorn
application = socketio

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    print(f"Painel Aviator Iniciado - Porta {port}")
    socketio.run(app, host="0.0.0.0", port=port)
