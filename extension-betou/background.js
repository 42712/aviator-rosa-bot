// Service worker - relay de mensagens entre content script e popup
let estado = {
  conectada: false,
  ultimaVela: '—',
  totalEnviadas: 0
};

chrome.runtime.onMessage.addListener((msg, sender) => {
  // Content script -> popup
  if (sender.tab && msg.tipo === 'status') {
    if (msg.ultimaVela) estado.ultimaVela = msg.ultimaVela;
    if (msg.totalEnviadas !== undefined) estado.totalEnviadas += msg.totalEnviadas;
    estado.conectada = msg.conectada;
    chrome.runtime.sendMessage({ tipo: 'statusAtualizado', ...estado }).catch(() => {});
    return false;
  }

  // Popup -> buscar estado atual
  if (msg.tipo === 'getStatus') {
    chrome.tabs.query({
      url: [
        'https://*.betou.bet.br/*',
        'https://*.spribegaming.com/*'
      ]
    }, (tabs) => {
      chrome.runtime.sendMessage({
        tipo: 'statusAtualizado',
        conectada: estado.conectada,
        ultimaVela: estado.ultimaVela,
        totalEnviadas: estado.totalEnviadas,
        abasAbertas: tabs ? tabs.length : 0
      }).catch(() => {});
    });
    return true;
  }

  // Megatron compat: AVIATOR_DATA do content script
  if (msg.type === "AVIATOR_DATA" && msg.data) {
    console.log("[Betou] AVIATOR_DATA received:", msg.data);
    fetch("https://painel-aviator.onrender.com/api/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fonte: "extensao_betou",
        token: "default",
        aviator: msg.data.aviator || 1,
        rodadas: [{
          rodada: msg.data.rodada || msg.data.round || 0,
          multiplicador: msg.data.mult || msg.data.multiplicador || msg.data.multiplier || msg.data.vela || 0,
          timestamp: msg.data.horario || msg.data.timestamp || new Date().toLocaleTimeString("pt-BR"),
          origem: "megatron"
        }]
      })
    }).then(() => {
      estado.totalEnviadas++;
      estado.conectada = true;
      chrome.runtime.sendMessage({ tipo: 'statusAtualizado', ...estado }).catch(() => {});
    }).catch(() => {});
    return false;
  }

  return false;
});

// Heartbeat periodico
setInterval(() => {
  fetch("https://painel-aviator.onrender.com/api/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      heartbeat: true,
      token: "default",
      aviator: 0,
      timestamp: new Date().toISOString()
    })
  }).catch(() => {});
}, 60000);

// Inicializa
chrome.runtime.sendMessage({
  tipo: 'statusAtualizado',
  conectada: false,
  ultimaVela: '—',
  totalEnviadas: 0,
  abasAbertas: 0
}).catch(() => {});

console.log('[Betou] Background v5.0');
