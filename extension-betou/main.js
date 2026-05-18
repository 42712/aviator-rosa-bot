// ===== MAIN World Script - injetado via chrome.scripting =====
// Esse script roda no mesmo mundo do jogo (WebSocket REAL)
(function() {
  if (window.__BETOU_MAIN) return;
  window.__BETOU_MAIN = true;

  var NativeWS = window.WebSocket;
  window.WebSocket = new Proxy(NativeWS, {
    construct: function(target, args) {
      try {
        var ws = new target(...args);
        ws.addEventListener('message', async function(e) {
          try {
            var data = e.data;
            if (data instanceof Blob) data = await data.text();
            if (typeof data === 'string' && data.length > 0) {
              window.postMessage({ type: '__BETOU_WS', data: data, time: Date.now() }, '*');
            }
          } catch(ex) {}
        });
        return ws;
      } catch(ex) { return new target(...args); }
    }
  });

  console.log('[Betou] MAIN world ativo');
})();
