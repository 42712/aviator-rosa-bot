// ===== Content Script - Captura dados do Aviator na Sorte da Bet =====
// Injeta na página e captura o WebSocket / DOM em tempo real
// Envia os dados via POST pro servidor do painel

const SERVER_URL = "https://painel-aviator.onrender.com";
const INTERVALO_ENVIO = 3; // segundos entre envios em lote

let ultimasVelas = [];
let ultimoEnvio = 0;

// ===== 1. CAPTURA VIA WEBSOCKET =====
// Intercepta WebSocket nativo
const OriginalWebSocket = window.WebSocket;

window.WebSocket = function(...args) {
    const ws = new OriginalWebSocket(...args);

    // Aguarda conexão e intercepta mensagens
    ws.addEventListener('message', function(event) {
        try {
            const data = JSON.parse(event.data);
            // Detecta se é dado de rodada
            const rodada = extrairRodada(data);
            if (rodada) {
                adicionarVela(rodada);
            }
        } catch(e) {
            // Ignora mensagens não-JSON
        }
    });

    return ws;
};

// ===== 2. CAPTURA VIA DOM =====
// Observa mudanças na página para capturar multiplicadores
const observer = new MutationObserver(() => {
    // Tenta capturar do DOM da Sorte da Bet
    const elementos = document.querySelectorAll(
        '[class*="multiplicador"], [class*="multiplier"], [class*="value"], ' +
        '[class*="round"], [class*="rodada"], [class*="payout"], ' +
        '.multiplier, .value, .round-number, .rodada-numero'
    );

    elementos.forEach(el => {
        const texto = el.textContent.trim();
        const mult = parseFloat(texto.replace('x', '').replace(',', '.'));
        if (mult && mult > 0) {
            const agora = Date.now();
            const rodada = {
                multiplicador: mult,
                timestamp: new Date().toLocaleTimeString('pt-BR'),
                origem: 'dom',
                capturado_em: agora
            };
            adicionarVela(rodada);
        }
    });
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
});

// ===== 3. FUNÇÕES AUXILIARES =====
function extrairRodada(data) {
    // Tenta vários formatos comuns de API de cassino
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
    // Formato 5: array com rodadas
    if (Array.isArray(data)) {
        return extrairRodada(data[0]);
    }
    // Formato 6: { data: { round: 123, multiplier: 1.45 } }
    if (data.data) {
        return extrairRodada(data.data);
    }

    return null;
}

function adicionarVela(rodada) {
    ultimasVelas.push({
        ...rodada,
        capturado_em: Date.now()
    });

    // Mantém últimas 10
    if (ultimasVelas.length > 10) {
        ultimasVelas.shift();
    }

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
            rodadas: lote,
            timestamp: new Date().toISOString()
        })
    }).catch(() => {
        // Falha silenciosa - tenta de novo no próximo lote
        // Re-adiciona ao buffer se falhar
        ultimasVelas.unshift(...lote);
        if (ultimasVelas.length > 20) {
            ultimasVelas = ultimasVelas.slice(-20);
        }
    });
}

// Envia heartbeat a cada 30s
setInterval(() => {
    fetch(`${SERVER_URL}/api/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            fonte: 'extensao_kiwi',
            heartbeat: true,
            timestamp: new Date().toISOString()
        })
    }).catch(() => {});
}, 30000);

console.log('[Painel Aviator] Extensão carregada - capturando dados em tempo real');
