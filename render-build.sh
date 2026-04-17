require('dotenv').config();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { RosaStrategy } = require('./strategies/rosaStrategy');
const { TelegramBot } = require('./telegram/bot');

puppeteer.use(StealthPlugin());

// Configurações
const BETOOU_URL = process.env.BETOOU_URL || 'https://betoou.com/casino/game/aviator';
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Inicializa estratégia e Telegram
const strategy = new RosaStrategy();
const telegram = new TelegramBot(TELEGRAM_TOKEN, TELEGRAM_CHAT_ID);

// Controle de tentativas
let tentativasRestantes = 0;
let aguardandoSinal = false;
let ultimoMultiplier = null;

// Função chamada quando uma nova vela é capturada
async function onNewMultiplier(multiplier, timestamp) {
  // Evita duplicatas
  if (multiplier === ultimoMultiplier) return;
  ultimoMultiplier = multiplier;
  
  console.log(`[${timestamp.toLocaleTimeString()}] 📊 ${multiplier}x`);
  
  // Adiciona ao histórico e calcula score
  strategy.addResult(multiplier, timestamp);
  const signal = strategy.deveEntrar();
  
  console.log(`   Score: ${signal.score}/10 | ${signal.motivo}`);
  
  // Gerenciamento de tentativas
  if (signal.entrar && !aguardandoSinal) {
    // Novo sinal - começa ciclo de tentativas
    tentativasRestantes = 3;
    aguardandoSinal = true;
    await telegram.sendSignal(signal);
  } 
  else if (aguardandoSinal && tentativasRestantes > 0) {
    if (multiplier >= 5.0) {
      // Acertou!
      await telegram.sendResult(multiplier, true);
      tentativasRestantes = 0;
      aguardandoSinal = false;
    } else {
      // Errou
      tentativasRestantes--;
      await telegram.sendResult(multiplier, false, tentativasRestantes);
      
      if (tentativasRestantes === 0) {
        aguardandoSinal = false;
        await telegram.sendMessage(`
🛑 *CICLO ENCERRADO* 🛑

3 tentativas esgotadas.
Aguardando próximo padrão.
        `);
      }
    }
  }
}

// Função para encontrar o caminho do Chrome no Render
function getChromePath() {
  // Possíveis caminhos do Chrome no Render
  const paths = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/opt/render/.cache/puppeteer/chrome/linux-133.0.6943.126/chrome-linux64/chrome',
    '/opt/render/.cache/puppeteer/chrome/linux-130.0.6723.69/chrome-linux64/chrome',
    '/opt/render/.cache/puppeteer/chrome/linux-128.0.6613.84/chrome-linux64/chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium'
  ];
  
  for (const path of paths) {
    if (path) return path;
  }
  return undefined; // Deixa o Puppeteer encontrar automaticamente
}

async function main() {
  console.log('🚀 Iniciando Aviator Rosa Bot...');
  console.log('📡 Conectando ao Telegram...');
  telegram.start();
  
  console.log('🌐 Conectando à Betoou...');
  console.log(`📝 URL: ${BETOOU_URL}`);
  
  // Configuração do navegador
  const chromePath = getChromePath();
  console.log(`🔧 Chrome path: ${chromePath || 'automático'}`);
  
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ]
  });
  
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);
  
  // Vai para o site
  await page.goto(BETOOU_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  console.log('✅ Página carregada');
  
  // Aguarda o jogo carregar
  try {
    await page.waitForSelector('.payout', { timeout: 30000 });
    console.log('✅ Elemento .payout encontrado!');
  } catch (e) {
    console.log('⚠️ .payout não encontrado, tentando alternativos...');
    await page.waitForSelector('[class*="payout"], [class*="multiplier"]', { timeout: 30000 });
    console.log('✅ Seletor alternativo encontrado!');
  }
  
  // Expõe função para o browser
  await page.exposeFunction('onNewMultiplier', onNewMultiplier);
  
  // Injeta o monitor
  await page.evaluate(() => {
    let lastMultiplier = null;
    
    const findMultiplier = () => {
      const selectors = ['.payout', '[class*="payout"]', '[class*="multiplier"]', '[class*="crash"]'];
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const text = el.innerText || el.textContent;
          const match = text.match(/(\d+\.?\d*)x/i);
          if (match) {
            return parseFloat(match[1]);
          }
        }
      }
      return null;
    };
    
    const checkMultiplier = () => {
      const multiplier = findMultiplier();
      
      if (multiplier !== null && multiplier !== lastMultiplier) {
        lastMultiplier = multiplier;
        window.onNewMultiplier(multiplier, new Date());
      }
    };
    
    setInterval(checkMultiplier, 800);
    console.log('✅ Monitor do Aviator iniciado');
  });
  
  console.log('🎯 Bot em execução! Aguardando sinais...');
  console.log('💬 As mensagens serão enviadas para o Telegram');
  
  // Mantém o bot rodando
  process.on('SIGINT', async () => {
    console.log('🛑 Desligando bot...');
    await browser.close();
    process.exit();
  });
}

main().catch(async (error) => {
  console.error('❌ Erro fatal:', error);
  await telegram.sendMessage(`❌ *ERRO NO BOT*\n\n\`${error.message}\``);
  process.exit(1);
});
