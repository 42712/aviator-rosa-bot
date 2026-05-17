// ===== Content Script - Captura dados do Aviator na Betou =====
// Mapeamento invertido:
//   Betou /aviator  (gráfico 1) → Painel Aviator 2
//   Betou /aviator2 (gráfico 2) → Painel Aviator 1

const SERVER_URL = "https://painel-aviator.onrender.com";
const INTERVALO_ENVIO = 3;

let lote = [];
let ultimoEnvio = 0;
let rodadasVistas = new Set();
let config = { token: 'default' };

function getAviatorPainel() {
  return window.location.pathname.includes('/aviator2') ? 1 : 2;
}

chrome.storage.sync.get(['token'], (cfg) => {
  if (cfg.token) config.token = cfg.token;
});

// ===== 1. WEBSOCKET =====
const NativeWS = window.WebSocket;
window.WebSocket = new Proxy(NativeWS, {
  construct(target, args) {
    const ws = new target(...args);
    ws.addEventListener('message', (event) => {
      try {
        const raw = event.data;
        if (typeof raw !== 'string') return;

        // STOMP JSON payload
        const objs = raw.match(/\{(?:[^{}]|"(?:\\.|[^"\\])*")*\}/g);
        if (objs) {
          objs.forEach(jstr => {
            try {
              const obj = JSON.parse(jstr);
              const mult = obj.multiplicador || obj.multiplier || obj.amount;
              let rodadaId = obj.round || obj.roundId || obj.gameRoundId || obj.id;
              if (mult && parseFloat(mult) > 0 && parseFloat(mult) < 1000) {
                if (!rodadaId) rodadaId = Math.floor(Math.random() * 9000000) + 1000000;
                adicionarRodada(parseFloat(mult), parseInt(rodadaId));
              }
            } catch (_) {}
          });
        }

        // Fallback regex
        const multMatch = raw.match(/["'](?:multiplicador|multiplier|amount)["']\s*:\s*([\d.]+)/i);
        if (multMatch) {
          const mult = parseFloat(multMatch[1]);
          if (mult > 0 && mult < 1000) {
            const idMatch = raw.match(/["'](?:round|roundId|gameRoundId|id)["']\s*:\s*(\d+)/i);
            const rid = idMatch ? parseInt(idMatch[1]) : Math.floor(Math.random() * 9000000) + 1000000;
            adicionarRodada(mult, rid);
          }
        }
      } catch (_) {}
    });
    return ws;
  }
});

// ===== 2. DOM =====
let timeoutDOM = null;
new MutationObserver(() => {
  if (timeoutDOM) return;
  timeoutDOM = setTimeout(() => {
    timeoutDOM = null;
    const el = document.querySelector('.bubble-multiplier');
    if (el) {
      const mult = parseFloat(el.textContent.replace('x', '').trim());
      if (mult && mult > 0 && mult < 1000) {
        const match = document.body.innerText.match(/Rodada\s*(\d+)/i);
        const rid = match ? parseInt(match[1]) : Math.floor(Math.random() * 9000000) + 1000000;
        adicionarRodada(mult, rid);
      }
    }
  }, 800);
}).observe(document.body || document.documentElement, { childList: true, subtree: true });

// ===== 3. ENVIO =====
function adicionarRodada(multiplicador, rodadaId) {
  const key = `${rodadaId}_${multiplicador.toFixed(2)}`;
  if (rodadasVistas.has(key)) return;
  rodadasVistas.add(key);
  if (rodadasVistas.size > 500) rodadasVistas = new Set([...rodadasVistas].slice(-250));

  lote.push({
    rodada: rodadaId,
    multiplicador: multiplicador,
    timestamp: new Date().toLocaleTimeString('pt-BR')
  });

  enviarLote();
}

function enviarLote() {
  const agora = Date.now();
  if (agora - ultimoEnvio < INTERVALO_ENVIO * 1000) return;

  if (lote.length === 0) return;
  ultimoEnvio = agora;

  const payload = {
    token: config.token,
    aviator: getAviatorPainel(),
    rodadas: lote.splice(0)
  };

  fetch(`${SERVER_URL}/api/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(r => r.json())
  .then(res => {
    const ultima = payload.rodadas[payload.rodadas.length - 1];
    chrome.runtime.sendMessage({
      tipo: 'status', conectada: true,
      ultimaVela: `${ultima.multiplicador.toFixed(2)}x (aviador ${payload.aviator})`,
      totalEnviadas: payload.rodadas.length
    }).catch(() => {});
  })
  .catch(() => {
    lote.push(...payload.rodadas);
    if (lote.length > 100) lote = lote.slice(-50);
  });
}

// Envio periódico de segurança (caso algo fique preso no buffer)
setInterval(() => { if (lote.length > 0) { ultimoEnvio = 0; enviarLote(); } }, 12000);
