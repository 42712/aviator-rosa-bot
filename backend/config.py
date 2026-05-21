"""Configuracoes do Painel Aviator
Tudo vem de variavel de ambiente, com valor padrao seguro.
"""
import os

# Servidor
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 5000))
DEBUG = os.getenv("DEBUG", "false").lower() == "true"

# Quantas velas o historico mostra por painel
MAX_HISTORICO = int(os.getenv("MAX_HISTORICO", "200"))

# Classificacao de cor por faixa de multiplicador
CORES = {
    "azul": {"nome": "Azul", "min": 1.00, "max": 1.99, "hex": "#349CFF"},
    "roxa": {"nome": "Roxa", "min": 2.00, "max": 9.99, "hex": "#913EF8"},
    "rosa": {"nome": "Rosa", "min": 10.00, "max": 9999.00, "hex": "#FF2D95"},
}
