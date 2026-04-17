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
    
    this.sendMessage(`
🚀 *BOT AVIATOR ROSA - ORACLE CLOUD* 🚀

✅ Estratégia carregada
✅ Monitoramento 24/7
✅ Aguardando padrões...

📊 *Regras ativas:*
• Compressão (5+ velas <2x) → +3
• Reset (1.00x) → +2
• Reset duplo → +3
• Falso alívio → bônus
• Pós-explosão → +2

🎯 Score mínimo: 5/10
🎲 Objetivo: 5x a 10x+
⚠️ Máximo 3 tentativas
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
🚨 *⚡ SINAL DE ENTRADA ⚡* 🚨

━━━━━━━━━━━━━━━━━━━━━━
🎯 *SCORE:* ${score}/10
📋 *MOTIVO:* ${motivo}
━━━━━━━━━━━━━━━━━━━━━━

⚡ *AÇÃO:* Entrar próximas 2-3 rodadas
🎲 *OBJETIVO:* 5x a 10x+

⚠️ *GERENCIAMENTO:* 3 tentativas

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
📢 *RESULTADO*

━━━━━━━━━━━━━━━━━━━━━━
🎲 *Multiplicador:* ${multiplier}x
📊 *Status:* ${status}
━━━━━━━━━━━━━━━━━━━━━━
    `;
    
    if (wasWin) {
      message += `\n${emoji} *ACERTOU!* ${emoji}\n✅ Ciclo encerrado.`;
    } else if (tentativasRestantes !== null) {
      message += `\n${emoji} *ERROU* ${emoji}\n📉 Restam: ${tentativasRestantes}`;
      if (tentativasRestantes === 0) {
        message += `\n🛑 Ciclo encerrado. Aguardando próximo sinal.`;
      }
    }
    
    await this.sendMessage(message);
  }
}

module.exports = { TelegramBot };
