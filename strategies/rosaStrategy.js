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
    const ultimas10 = this.historico.slice(0, 10);
    
    // PADRÃO A: Compressão Forte (5+ velas abaixo de 2.0x)
    const abaixo2x = ultimas6.filter(v => v.multiplier < 2.0).length;
    if (abaixo2x >= 5) {
      score += 3;
      console.log(`   +3 compressão (${abaixo2x}/6 <2x)`);
    }
    
    // PADRÃO B: Reset (1.00x nos últimos 4)
    const temReset = ultimas6.slice(0, 4).some(v => v.multiplier <= 1.05);
    if (temReset) {
      score += 2;
      console.log(`   +2 reset (1.00x detectado)`);
    }
    
    // PADRÃO C: Reset duplo (dois 1.00x seguidos)
    let resetCount = 0;
    for (let i = 0; i < ultimas6.length && i < 3; i++) {
      if (ultimas6[i].multiplier <= 1.05) resetCount++;
    }
    if (resetCount >= 2) {
      score += 3;
      console.log(`   +3 reset duplo (${resetCount}x 1.00x)`);
    }
    
    // PADRÃO D: Falso Alívio (1.x -> 3x-6x -> 1.x)
    if (ultimas6.length >= 3) {
      const first = ultimas6[2]?.multiplier || 0;
      const middle = ultimas6[1]?.multiplier || 0;
      const last = ultimas6[0]?.multiplier || 0;
      
      if (first < 1.5 && middle >= 3.0 && middle <= 7.0 && last < 1.5) {
        const bonus = Math.min(middle / 2, 3);
        score += bonus;
        console.log(`   +${bonus.toFixed(1)} falso alívio (${first} → ${middle} → ${last})`);
      }
    }
    
    // PADRÃO E: Pós-Explosão (teve 20x+ entre 5-12 rodadas atrás)
    for (let i = 5; i < 12 && i < this.historico.length; i++) {
      if (this.historico[i]?.multiplier >= 20) {
        score += 2;
        console.log(`   +2 pós-explosão (${this.historico[i].multiplier}x há ${i} rodadas)`);
        break;
      }
    }
    
    // PADRÃO F: Muito tempo sem rosa
    let rodadasSemRosa = 0;
    for (let v of this.historico) {
      if (v.multiplier >= 10) break;
      rodadasSemRosa++;
    }
    if (rodadasSemRosa >= 20) {
      score += 2;
      console.log(`   +2 jejum (${rodadasSemRosa} rodadas sem 10x+)`);
    }
    
    this.scoreAtual = Math.min(score, 10);
    return this.scoreAtual;
  }
  
  deveEntrar() {
    // Não entra se acabou de sair rosa
    if (this.historico[0]?.multiplier >= 10) {
      return { 
        entrar: false, 
        motivo: "Acabou de sair rosa, aguardar esfriar", 
        score: this.scoreAtual 
      };
    }
    
    // Sinal forte
    if (this.scoreAtual >= 6) {
      return { 
        entrar: true, 
        motivo: `Sinal FORTE! Score ${this.scoreAtual}/10`, 
        score: this.scoreAtual 
      };
    }
    
    // Sinal moderado
    if (this.scoreAtual >= 5) {
      return { 
        entrar: true, 
        motivo: `Sinal moderado (${this.scoreAtual}/10)`, 
        score: this.scoreAtual 
      };
    }
    
    return { 
      entrar: false, 
      motivo: `Aguardando padrão (Score ${this.scoreAtual}/10)`, 
      score: this.scoreAtual 
    };
  }
  
  getHistorico() {
    return this.historico;
  }
}

module.exports = { RosaStrategy };
