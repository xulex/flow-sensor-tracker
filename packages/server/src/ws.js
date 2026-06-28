/**
 * WebSocket handler — receives raw tracker samples, scores them, stores results.
 */

import { WebSocketServer } from 'ws';
import { score } from '@flow-sensor/scorer';
import { upsertSession, insertEvent } from './db.js';

export function attachWs(server) {
  const wss = new WebSocketServer({ server, path: '/stream' });

  wss.on('connection', (ws) => {
    ws.on('message', (data) => {
      let sample;
      try { sample = JSON.parse(data); } catch { return; }

      const { sessionId, siteId = 'unknown', ...rest } = sample;
      if (!sessionId) return;

      upsertSession(sessionId, siteId);

      const scored = score({ sessionId, ...rest });
      insertEvent(scored);

      // Echo score back so the host page can react in real-time
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'score', ...scored.dimensions, ts: scored.ts }));
      }
    });
  });

  return wss;
}
