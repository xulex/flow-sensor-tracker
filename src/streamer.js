/**
 * Streams samples to the server via WebSocket.
 *
 * Ack tracking: every sent sample stays in `pending` until the server echoes
 * back a score with the matching ts. On pagehide, all pending samples are
 * flushed via sendBeacon to POST /api/ingest so no data is lost if the WS
 * connection drops or never opens.
 */

const MAX_PENDING = 3600; // ~1 hour at 1 Hz before we start dropping oldest

export function createStreamer(endpoint, sessionId, siteId) {
  let ws = null;
  // Map<ts, JSON string> — sent but not yet acked by server
  const pending = new Map();

  function add(payload) {
    const msg = { sessionId, siteId, ...payload };
    const key = payload.ts ?? Date.now();
    pending.set(key, msg);

    // Evict oldest if cap exceeded
    if (pending.size > MAX_PENDING) {
      pending.delete(pending.keys().next().value);
    }

    return { key, msg };
  }

  function send(payload) {
    const { key, msg } = add(payload);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
    return key;
  }

  function flushPendingOverWs() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    for (const msg of pending.values()) {
      ws.send(JSON.stringify(msg));
    }
  }

  function ack(ts) {
    pending.delete(ts);
  }

  function beaconFlush() {
    if (!pending.size) return;
    const url = endpoint.replace(/\/$/, '') + '/api/ingest';
    const body = JSON.stringify([...pending.values()]);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    }
    // Don't clear pending — if beacon fails silently there's nothing we can do,
    // but we don't want to double-send if the page somehow stays alive.
  }

  function connect() {
    const wsUrl = endpoint.replace(/^http/, 'ws') + '/stream';
    ws = new WebSocket(wsUrl);

    ws.onopen = flushPendingOverWs;

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'score' && msg.ts != null) {
          ack(msg.ts);
        }
      } catch { /* ignore malformed */ }
    };

    ws.onclose = () => setTimeout(connect, 3000);
    ws.onerror = () => ws.close();
  }

  function setupBeacon() {
    // pagehide fires reliably on mobile and on tab-close; visibilitychange
    // as a fallback for browsers that skip pagehide on navigation.
    window.addEventListener('pagehide', beaconFlush, { once: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') beaconFlush();
    });
  }

  return {
    start() { connect(); setupBeacon(); },
    send,
    stop() { beaconFlush(); ws && ws.close(); },
    get pendingCount() { return pending.size; },
  };
}
