import http from 'http';
import { resolve } from 'path';
import express from 'express';
import cors from 'cors';
import { openDb, getSessionSummary, getAllSessions } from './db.js';
import { attachWs } from './ws.js';
import { weightsRouter } from './weights-api.js';
import { setWeightsPath } from '@flow-sensor/scorer';
import { mkdir } from 'fs/promises';

await mkdir('data', { recursive: true });
openDb();

const WEIGHTS_PATH = resolve(process.env.WEIGHTS_PATH || '../../weights/table12.json');
setWeightsPath(WEIGHTS_PATH);

const app = express();
app.use(cors());
app.use(express.json());

// Serve tracker snippet
app.use('/flow-sensor.js', express.static('../tracker/dist/flow-sensor.js'));

// Weights — dynamic, no restart needed
app.use('/api/weights', weightsRouter(WEIGHTS_PATH));

// Sessions
app.get('/api/sessions', (_req, res) => {
  res.json(getAllSessions());
});

app.get('/api/sessions/:id', (req, res) => {
  const summary = getSessionSummary(req.params.id);
  if (!summary) return res.status(404).json({ error: 'not found' });
  res.json(summary);
});

const server = http.createServer(app);
attachWs(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`flow-sensor server on :${PORT} | weights: ${WEIGHTS_PATH}`));
