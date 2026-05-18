// ===== Content Script - Betou Coletor v5.0 (WS + SockJS + DOM) =====
const SERVER_URL = "https://painel-aviator.onrender.com";
const INTERVALO_ENVIO = 3;
const DEBOUNCE_DOM = 800;

const isSpribe = location.hostname.includes('spribegaming');
const isBetou = location.hostname.includes('betou');

let ultimasVelas = [];
let ultimoEnvio = 0;
let rodadasVistas = new Set();
let config = { token: 'default', aviator: 1 };
let lastMultiplier = null;
let lastRound = null;

// Carrega config do storage
chrome.storage.sync.get(['token', 'aviator'], (cfg) => {
  if (cfg.token) config.token = cfg.token;
  if (cfg.aviator) config.aviator = parseInt(cfg.aviator);
});

// ===== INVERSAO: /aviator2 no Betou = Painel 1 =====
function getPainel() {
  try {
    if (isBetou && location.href.includes('/aviator2')) return 1;
    return config.aviator || 1;
  } catch(e) { return config.aviator || 1; }
}

function getTimeNow() {
  return new Date().toLocaleTimeString('pt-BR');
}

// ===== 1. CAPTURA VIA WEBSOCKET (Proxy - funciona c/ SockJS/STOMP) =====
const NativeWS = window.WebSocket;

window.WebSocket = new Proxy(NativeWS, {
  construct(target, args) {
    const ws = new target(...args);
    ws.addEventListener('message', async (event) => {
      try {
        let data = event.data;

        // Converte Blob para texto se necessario (SockJS)
        if (data instanceof Blob) {
          data = await data.text();
        }

        if (typeof data !== 'string') return;

        // SockJS: mensagens STOMP encapsuladas em array: a["...","..."]
        if (data.startsWith('a[')) {
          try {
            const arr = JSON.parse(data);
            if (Array.isArray(arr)) {
              arr.forEach(msg => {
                if (typeof msg === 'string') {
                  processarFrameSTOMP(msg);
                }
              });
            }
          } catch(e) {}
          return;
        }

        // JSON direto
        const json = JSON.parse(data);
        const rodada = extrairRodada(json);
        if (rodada) {
          console.log(`📡 WS: rodada=${rodada.rodada} mult=${rodada.mult?.toFixed(2)}x`);
          adicionarVela(rodada);
        }
      } catch (e) { /* ignorado */ }
    });
    return ws;
  }
});

// ===== 1.1 Parsing de frames STOMP/SockJS =====
function processarFrameSTOMP(msg) {
  // Formato STOMP: "MESSAGE\ndest:...\n...\n\n{\"body\"}\0"
  try {
    // Tenta JSON direto primeiro
    if (msg.startsWith('{') || msg.startsWith('[')) {
      const clean = msg.replace(/\0+$/, ''); // remove null chars
      const json = JSON.parse(clean);
      const rodada = extrairRodada(json);
      if (rodada) {
        console.log(`📦 STOMP: rodada=${rodada.rodada} mult=${rodada.mult?.toFixed(2)}x`);
        adicionarVela(rodada);
      }
      return;
    }

    // STOMP frame: procura JSON no body (apos \n\n)
    const bodyMatch = msg.match(/\n\n(.+)/s);
    if (bodyMatch) {
      let raw = bodyMatch[1].replace(/\0+$/, '').trim();
      if (raw.startsWith('{') || raw.startsWith('[')) {
        const json = JSON.parse(raw);
        const rodada = extrairRodada(json);
        if (rodada) {
          console.log(`📦 STOMP: rodada=${rodada.rodada} mult=${rodada.mult?.toFixed(2)}x`);
          adicionarVela(rodada);
        }
      }
    }
  } catch(e) {}
}

// ===== 2. CAPTURA VIA DOM (fallback) =====
let timeoutDOM = null;
let ultimoValorDOM = null;
let ultimaRodadaDOM = null;

const observer = new MutationObserver(() => {
  if (timeoutDOM) return;
  timeoutDOM = setTimeout(() => {
    timeoutDOM = null;

    // Captura rodada atual
    let rodadaAtual = null;
    const todosEl = document.querySelectorAll('span, div, h1, h2, h3, p, label, b, strong');
    for (const el of todosEl) {
      if (el.children.length) continue;
      const txt = (el.innerText || el.textContent || "").trim();
      const m = txt.match(/[Rr]odada\s+(\d{4,})/);
      if (m) { rodadaAtual = m[1]; break; }
      const mR = txt.match(/[Rr]ound\s+(\d{4,})/);
      if (mR) { rodadaAtual = mR[1]; break; }
    }

    // Captura multiplicador
    const elementos = document.querySelectorAll(
      '[class*="multiplicador"], [class*="multiplier"], ' +
      '[class*="round"], [class*="rodada"], ' +
      '.multiplier, .value, .round-number, ' +
      '.bubble-multiplier, .payout'
    );
    elementos.forEach(el => {
      const texto = el.textContent.trim();
      const mult = parseFloat(texto.replace('x', '').replace(',', '.'));
      if (mult && mult > 0 && mult < 100000) {
        if (rodadaAtual && rodadaAtual !== ultimaRodadaDOM) {
          ultimoValorDOM = null;
          ultimaRodadaDOM = rodadaAtual;
        }
        if (mult === ultimoValorDOM) return;
        ultimoValorDOM = mult;
        lastMultiplier = mult;
        if (rodadaAtual) lastRound = rodadaAtual;

        const agora = Date.now();
        const key = rodadaAtual ? `dom_${rodadaAtual}_${mult.toFixed(2)}` : `dom_${Math.floor(agora / 5000)}_${mult.toFixed(2)}`;
        if (rodadasVistas.has(key)) return;
        rodadasVistas.add(key);
        console.log(`🟣 DOM: ${mult.toFixed(2)}x rodada=${rodadaAtual || '?'}`);
        adicionarVela({
          rodada: rodadaAtual ? parseInt(rodadaAtual) : undefined,
          multiplicador: mult,
          timestamp: getTimeNow(),
          origem: 'dom'
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

// ===== 3. FUNCOES =====
function extrairRodada(data) {
  if (!data || typeof data !== 'object') return null;
  // Formato 1: { round: 123, multiplier: 1.45 }
  if (data.round && data.multiplier !== undefined) {
    return { rodada: data.round, mult: parseFloat(data.multiplier) };
  }
  // Formato 2: { rodada: 123, mult: 1.45 }
  if (data.rodada && data.mult !== undefined) {
    return { rodada: data.rodada, mult: parseFloat(data.mult) };
  }
  // Formato 3: { roundId: 123, multiplier: 1.45 }
  if (data.roundId && data.multiplier !== undefined) {
    return { rodada: data.roundId, mult: parseFloat(data.multiplier) };
  }
  // Formato 4: { id: 123, value: 1.45 }
  if (data.id && data.value !== undefined) {
    return { rodada: data.id, mult: parseFloat(data.value) };
  }
  // Formato 5: { r: 123, m: 1.45 }
  if (data.r && data.m !== undefined) {
    return { rodada: data.r, mult: parseFloat(data.m) };
  }
  // Formato 6: { rodada: 123, multiplicador: 1.45 }
  if (data.rodada && data.multiplicador !== undefined) {
    return { rodada: data.rodada, mult: parseFloat(data.multiplicador) };
  }
  // Formato 7: array
  if (Array.isArray(data)) {
    return extrairRodada(data[0]);
  }
  // Formato 8: { data: { ... } }
  if (data.data && typeof data.data === 'object') {
    return extrairRodada(data.data);
  }
  // Formato 9: { payload: { ... } } / { result: { ... } } / { args: { ... } }
  if (data.payload) return extrairRodada(data.payload);
  if (data.result) return extrairRodada(data.result);
  if (data.args) return extrairRodada(data.args);
  // Formato 10: { body: { ... } } (STOMP body)
  if (data.body) return extrairRodada(data.body);

  return null;
}

function adicionarVela(rodada) {
  const id = rodada.rodada || rodada.capturado_em || Date.now();
  if (rodadasVistas.has(id)) return;
  rodadasVistas.add(id);
  if (rodadasVistas.size > 2000) {
    rodadasVistas = new Set([...rodadasVistas].slice(-1000));
  }

  if (rodada.rodada) lastRound = rodada.rodada;
  if (rodada.mult || rodada.multiplicador) lastMultiplier = rodada.mult || rodada.multiplicador;

  ultimasVelas.push({ ...rodada, capturado_em: Date.now() });
  if (ultimasVelas.length > 30) ultimasVelas = ultimasVelas.slice(-30);
  enviarLote();
}

function enviarLote() {
  const agora = Date.now();
  if (agora - ultimoEnvio < INTERVALO_ENVIO * 1000) return;
  if (ultimasVelas.length === 0) return;
  ultimoEnvio = agora;
  const lote = [...ultimasVelas];
  ultimasVelas = [];

  const rodadas = lote.map(v => ({
    rodada: v.rodada || 0,
    multiplicador: v.mult || v.multiplicador || 0,
    timestamp: v.timestamp || getTimeNow(),
    origem: v.origem || 'extensao'
  }));

  fetch(`${SERVER_URL}/api/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fonte: 'extensao_betou',
      token: config.token,
      aviator: getPainel(),
      rodadas: rodadas,
      timestamp: new Date().toISOString()
    })
  }).then(() => {
    chrome.runtime.sendMessage({
      tipo: 'status',
      conectada: true,
      ultimaVela: lote.length > 0
        ? `${(lote[lote.length-1].mult || lote[lote.length-1].multiplicador || 0).toFixed(2)}x`
        : '—',
      totalEnviadas: lote.length
    }).catch(() => {});
  }).catch(() => {
    ultimasVelas.unshift(...lote);
    if (ultimasVelas.length > 50) ultimasVelas = ultimasVelas.slice(-50);
  });
}

// Heartbeat a cada 30s
setInterval(() => {
  fetch(`${SERVER_URL}/api/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fonte: 'extensao_betou',
      token: config.token,
      aviator: getPainel(),
      heartbeat: true,
      timestamp: new Date().toISOString()
    })
  }).then(() => {
    chrome.runtime.sendMessage({ tipo: 'status', conectada: true }).catch(() => {});
  }).catch(() => {});
}, 30000);

// Envio forçado a cada 5s
setInterval(() => {
  if (ultimasVelas.length > 0) {
    ultimoEnvio = 0;
    enviarLote();
  }
}, 5000);

// Polling DOM extra a cada 1s (fallback pesado)
setInterval(() => {
  try {
    const payouts = document.querySelectorAll('.payout');
    if (payouts.length) {
      const txt = payouts[0].innerText.trim();
      const mult = parseFloat(txt.replace('x', '').replace(',', '.'));
      if (!isNaN(mult) && mult > 0 && mult < 100000 && mult !== lastMultiplier) {
        lastMultiplier = mult;
        const key = `dom_payout_${mult.toFixed(2)}_${Date.now()}`;
        if (rodadasVistas.has(key)) return;
        rodadasVistas.add(key);
        console.log(`🟣 DOM payout: ${mult.toFixed(2)}x`);
        adicionarVela({
          multiplicador: mult,
          timestamp: getTimeNow(),
          origem: 'dom_payout'
        });
      }
    }
  } catch(e) {}
}, 1000);

// Anti-throttle
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
setInterval(() => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
}, 10000);

console.log(`[Betou v5.0] Ativo | ${location.hostname} | Painel ${getPainel()}`);
