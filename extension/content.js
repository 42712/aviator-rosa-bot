// ===== Content Script - Captura dados do Aviator na Sorte da Bet =====
const SERVER_URL = "https://painel-aviator.onrender.com";
const INTERVALO_ENVIO = 3;
const DEBOUNCE_DOM = 800;

let ultimasVelas = [];
let ultimoEnvio = 0;
let rodadasVistas = new Set();
let config = { token: 'default', aviator: 1 };

// Carrega config do storage
chrome.storage.sync.get(['token', 'aviator'], (cfg) => {
  if (cfg.token) config.token = cfg.token;
  if (cfg.aviator) config.aviator = parseInt(cfg.aviator);
});

// ===== 1. CAPTURA VIA WEBSOCKET =====
const NativeWS = window.WebSocket;

window.WebSocket = new Proxy(NativeWS, {
  construct(target, args) {
    const ws = new target(...args);
    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        const rodada = extrairRodada(data);
        if (rodada) adicionarVela(rodada);
      } catch (e) { /* ignorado */ }
    });
    return ws;
  }
});

// ===== 2. CAPTURA VIA DOM (fallback) =====
let timeoutDOM = null;

const observer = new MutationObserver(() => {
  if (timeoutDOM) return;
  timeoutDOM = setTimeout(() => {
    timeoutDOM = null;
    const elementos = document.querySelectorAll(
      '[class*="multiplicador"], [class*="multiplier"], ' +
      '[class*="round"], [class*="rodada"], ' +
      '.multiplier, .value, .round-number'
    );
    elementos.forEach(el => {
      const texto = el.textContent.trim();
      const mult = parseFloat(texto.replace('x', '').replace(',', '.'));
      if (mult && mult > 0 && mult < 1000) {
        const agora = Date.now();
        const key = `dom_${Math.floor(agora / 5000)}_${mult.toFixed(2)}`;
        if (rodadasVistas.has(key)) return;
        rodadasVistas.add(key);
        adicionarVela({
          multiplicador: mult,
          timestamp: new Date().toLocaleTimeString('pt-BR'),
          origem: 'dom',
          capturado_em: agora
        });
      }
    });
  }, DEBOUNCE_DOM);
});

if (document.body) {
  observer.observe(document.body, { childList: true, subtree: true });
} else {
  document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

// ===== 3. FUNÇÕES =====
function extrairRodada(data) {
  if (!data || typeof data !== 'object') return null;
  // Formato 1: { round: 123, multiplier: 1.45 }
  if (data.round && data.multiplier) {
    return { rodada: data.round, mult: data.multiplier };
  }
  // Formato 2: { rodada: 123, mult: 1.45 }
  if (data.rodada && data.mult) {
    return { rodada: data.rodada, mult: data.mult };
  }
  // Formato 3: { id: 123, value: 1.45 }
  if (data.id && data.value) {
    return { rodada: data.id, mult: data.value };
  }
  // Formato 4: { r: 123, m: 1.45 }
  if (data.r && data.m) {
    return { rodada: data.r, mult: data.m };
  }
  // Formato 5: array
  if (Array.isArray(data)) {
    return extrairRodada(data[0]);
  }
  // Formato 6: { data: { ... } }
  if (data.data) {
    return extrairRodada(data.data);
  }
  return null;
}

function adicionarVela(rodada) {
  const id = rodada.rodada || rodada.capturado_em || Date.now();
  if (rodadasVistas.has(id)) return;
  rodadasVistas.add(id);
  if (rodadasVistas.size > 500) {
    rodadasVistas = new Set([...rodadasVistas].slice(-250));
  }
  ultimasVelas.push({ ...rodada, capturado_em: Date.now() });
  if (ultimasVelas.length > 10) ultimasVelas.shift();
  enviarLote();
}

function enviarLote() {
  const agora = Date.now();
  if (agora - ultimoEnvio < INTERVALO_ENVIO * 1000) return;
  if (ultimasVelas.length === 0) return;
  ultimoEnvio = agora;
  const lote = [...ultimasVelas];
  ultimasVelas = [];
  fetch(`${SERVER_URL}/api/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fonte: 'extensao_kiwi',
      token: config.token,
      aviator: config.aviator,
      rodadas: lote,
      timestamp: new Date().toISOString()
    })
  }).then(() => {
    chrome.runtime.sendMessage({
      tipo: 'status',
      conectada: true,
      ultimaVela: lote.length > 0 ? `${lote[lote.length-1].multiplicador || lote[lote.length-1].mult}x` : '—',
      totalEnviadas: lote.length
    }).catch(() => {});
  }).catch(() => {
    ultimasVelas.unshift(...lote);
    if (ultimasVelas.length > 20) ultimasVelas = ultimasVelas.slice(-20);
  });
}

// Heartbeat
setInterval(() => {
  fetch(`${SERVER_URL}/api/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fonte: 'extensao_kiwi',
      token: config.token,
      aviator: config.aviator,
      heartbeat: true,
      timestamp: new Date().toISOString()
    })
  }).then(() => {
    chrome.runtime.sendMessage({ tipo: 'status', conectada: true }).catch(() => {});
  }).catch(() => {});
}, 30000);

console.log('[Painel Aviator] Extensão carregada');
