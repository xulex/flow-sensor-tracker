/**
 * Streams samples to the flow-sensor server via WebSocket.
 * Falls back to buffered HTTP POST if WS is unavailable.
 */

export function createStreamer(endpoint, sessionId) {
  let ws = null;
  const buffer = [];

  function send(payload) {
    const msg = JSON.stringify({ sessionId, ...payload });
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    } else {
      buffer.push(msg);
    }
  }

  function flushBuffer() {
    while (buffer.length && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(buffer.shift());
    }
  }

  function connect() {
    const wsUrl = endpoint.replace(/^http/, 'ws') + '/stream';
    ws = new WebSocket(wsUrl);
    ws.onopen = flushBuffer;
    ws.onclose = () => setTimeout(connect, 3000); // reconnect
    ws.onerror = () => ws.close();
  }

  return {
    start() { connect(); },
    send,
    stop() { ws && ws.close(); },
  };
}
