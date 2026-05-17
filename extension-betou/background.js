// Service worker Betou
let estado = {
  conectada: false,
  ultimaVela: '—',
  totalEnviadas: 0
};

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (sender.tab && msg.tipo === 'status') {
    if (msg.ultimaVela) estado.ultimaVela = msg.ultimaVela;
    if (msg.totalEnviadas !== undefined) estado.totalEnviadas = msg.totalEnviadas;
    estado.conectada = msg.conectada;
    chrome.runtime.sendMessage({ tipo: 'statusAtualizado', ...estado }).catch(() => {});
    return false;
  }

  if (msg.tipo === 'getStatus') {
    chrome.tabs.query({ url: ['https://betou.bet.br/games/spribe/aviator*'] }, (tabs) => {
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

  return false;
});

chrome.runtime.sendMessage({
  tipo: 'statusAtualizado',
  conectada: false, ultimaVela: '—', totalEnviadas: 0, abasAbertas: 0
}).catch(() => {});
