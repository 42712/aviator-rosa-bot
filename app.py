"""Ponto de entrada do Painel Aviator - Render roda este arquivo."""
import os
import sys

backend = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend)

from server import app  # noqa: E402

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    print(f"[Painel Aviator] iniciando na porta {port}", flush=True)
    from waitress import serve
    serve(app, host="0.0.0.0", port=port)
