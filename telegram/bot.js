const { Telegraf } = require('telegraf');

class TelegramBot {
  constructor(token, chatId) {
    this.token = token;
    this.chatId = chatId;
    this.bot = null;
  }
  
  start() {
    if (!this.token || !this.chatId) {
      console.error('❌ TELEGRAM_TOKEN ou TELEGRAM_CHAT_ID não configurados!');
      return;
    }
    
    this.bot = new Telegraf(this.token);
    this.bot.launch();
    console.log('🤖 Telegram bot conectado');
    
    // Envia mensagem de inicialização
    this.sendMessage(`
🚀 *BOT AVIATOR ROSA INICIADO* 🚀

✅ Estratégia carregada
✅ Monitoramento em tempo real
✅ Aguardando padrões...

📊 *Regras ativas:*
• Compressão (5+ velas <2x)
• Reset (1.00x)
• Falso alívio
• Pós-explosão

🎯 Score mínimo para sinal: 5/10
🎲 Objetivo: 5x a 10x+
⚠️ Máximo 3 tentativas por sinal
    `);
  }
  
  async sendMessage(message) {
    try {
      if (this.bot && this.chatId) {
        await this.bot.telegram.sendMessage(this.chatId, message, { parseMode: 'Markdown' });
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error.message);
    }
  }
  
  async sendSignal(signal) {
    const { entrar, motivo, score } = signal;
    
    let message = '';
    if (entrar) {
      message = `
🚨 *⚡ SINAL DE ENTRADA LIBERADO ⚡* 🚨

━━━━━━━━━━━━━━━━━━━━━━
🎯 *SCORE:* ${score}/10
📋 *MOTIVO:* ${motivo}
━━━━━━━━━━━━━━━━━━━━━━

⚡ *AÇÃO:* Entrar nas próximas 2-3 rodadas
🎲 *OBJETIVO:* 5x a 10x+

⚠️ *GERENCIAMENTO:* 
• Máximo 3 tentativas
• Stop loss nas 3 perdas

🎯 *BOA SORTE!* 🍀
      `;
    } else {
      message = `
🟡 *AGUARDAR* 🟡

━━━━━━━━━━━━━━━━━━━━━━
📊 *SCORE:* ${score}/10
📋 *MOTIVO:* ${motivo}
━━━━━━━━━━━━━━━━━━━━━━

⌛ Aguardando próximo padrão...
      `;
    }
    
    await this.sendMessage(message);
  }
  
  async sendResult(multiplier, wasWin, tentativasRestantes = null) {
    const status = wasWin ? '✅ *GREEN* ✅' : '❌ *RED* ❌';
    const emoji = wasWin ? '🎉🎉🎉' : '😔';
    
    let message = `
📢 *RESULTADO DA RODADA*

━━━━━━━━━━━━━━━━━━━━━━
🎲 *Multiplicador:* ${multiplier}x
📊 *Status:* ${status}
━━━━━━━━━━━━━━━━━━━━━━
    `;
    
    if (wasWin) {
      message += `
${emoji} *ACERTOU!* ${emoji}

✅ Saiu no lucro!
🛑 Ciclo encerrado. Aguardando próximo sinal.
      `;
    } else if (tentativasRestantes !== null) {
      message += `
${emoji} *ERROU* ${emoji}

📉 Tentativas restantes: ${tentativasRestantes}

${tentativasRestantes > 0 ? '🔁 Continue tentando!' : '🛑 Ciclo encerrado. Aguardando próximo sinal.'}
      `;
    }
    
    await this.sendMessage(message);
  }
}

module.exports = { TelegramBot };
