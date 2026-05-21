"""Modelo de dados para rodadas do Aviator"""
from datetime import datetime
from config import CORES


class Rodada:
    """Representa uma rodada (vela) do Aviator"""

    def __init__(self, rodada_id, multiplicador, timestamp=None):
        self.rodada_id = rodada_id
        self.multiplicador = round(float(multiplicador), 2)
        self.timestamp = timestamp or datetime.now().strftime("%H:%M:%S")
        self.cor = self._classificar_cor(self.multiplicador)
        self.soma = self._calcular_soma(self.multiplicador)

    def _classificar_cor(self, mult):
        for cor, cfg in CORES.items():
            if cfg["min"] <= mult <= cfg["max"]:
                return cor
        return "azul"

    def _calcular_soma(self, mult):
        """Soma dos digitos. Ex: 1.23 -> 1+2+3 = 6"""
        soma = 0
        for char in f"{mult:.2f}":
            if char.isdigit():
                soma += int(char)
        return soma

    def to_dict(self):
        return {
            "rodada": self.rodada_id,
            "multiplicador": self.multiplicador,
            "timestamp": self.timestamp,
            "cor": self.cor,
            "soma": self.soma,
            "exibicao": f"{self.multiplicador:.2f}x"
        }
