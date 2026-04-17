class RosaStrategy {
  constructor() {
    this.historico = [];
    this.maxHistorico = 30;
    this.scoreAtual = 0;
  }

  addResult(multiplier, timestamp) {
    this.historico.unshift({ multiplier, timestamp });
    if (this.historico.length > this.maxHistorico) {
      this.historico.pop();
    }
    this.calcularScore();
  }

  calcularScore() {
    let score = 0;
    const ultimas6 = this.historico.slice(0, 6);
    
    // Compressão (5+ velas <2x)
    const abaixo2x = ultimas6.filter(v => v.multiplier < 2.0).length;
    if (abaixo2x >= 5) score += 3;
    
    // Reset (1.00x)
    const temReset = ultimas6.slice(0, 4).some(v => v.multiplier <= 1.05);
    if (temReset) score += 2;
    
    // Reset duplo
    let resetCount = 0;
    for (let i = 0; i < Math.min(ultimas6.length, 3); i++) {
      if (ultimas6[i].multiplier <= 1.05) resetCount++;
    }
    if (resetCount >= 2) score += 3;
    
    // Falso alívio
    if (ultimas6.length >= 3) {
      const first = ultimas6[2]?.multiplier || 0;
      const middle = ultimas6[1]?.multiplier || 0;
      const last = ultimas6[0]?.multiplier || 0;
      
      if (first < 1.5 && middle >= 3.0 && middle <= 7.0 && last < 1.5) {
        score += Math.min(middle / 2, 3);
      }
    }
    
    // Pós-explosão
    for (let i = 5; i < 12 && i < this.historico.length; i++) {
      if (this.historico[i]?.multiplier >= 20) {
        score += 2;
        break;
      }
    }
    
    // Jejum de rosa
    let rodadasSemRosa = 0;
    for (let v of this.historico) {
      if (v.multiplier >= 10) break;
      rodadasSemRosa++;
    }
    if (rodadasSemRosa >= 20) score += 2;
    
    this.scoreAtual = Math.min(score, 10);
    return this.scoreAtual;
  }
  
  deveEntrar() {
    if (this.historico[0]?.multiplier >= 10) {
      return { entrar: false, motivo: "Acabou de sair rosa", score: this.scoreAtual };
    }
    
    if (this.scoreAtual >= 6) {
      return { entrar: true, motivo: `Sinal FORTE! Score ${this.scoreAtual}/10`, score: this.scoreAtual };
    }
    
    if (this.scoreAtual >= 5) {
      return { entrar: true, motivo: `Sinal moderado (${this.scoreAtual}/10)`, score: this.scoreAtual };
    }
    
    return { entrar: false, motivo: `Aguardando (Score ${this.scoreAtual}/10)`, score: this.scoreAtual };
  }
}

module.exports = { RosaStrategy };
