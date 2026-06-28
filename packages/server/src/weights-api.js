/**
 * REST API for dynamic weight management.
 *
 * GET  /api/weights              — current weights file
 * PUT  /api/weights              — replace full weights (saves version snapshot)
 * PATCH /api/weights/signals/:key — update one signal's fields
 * GET  /api/weights/history      — list all saved versions
 * GET  /api/weights/history/:id  — retrieve a specific version snapshot
 * POST /api/weights/history/:id/restore — restore a past version as current
 */

import { readFileSync, writeFileSync } from 'fs';
import { Router } from 'express';
import { saveWeightVersion, getWeightHistory, getWeightVersion } from './db.js';

export function weightsRouter(weightsPath) {
  const router = Router();

  function read() {
    return JSON.parse(readFileSync(weightsPath, 'utf8'));
  }

  function write(data) {
    writeFileSync(weightsPath, JSON.stringify(data, null, 2));
  }

  function nextVersion(current) {
    const match = (current?._meta?.version ?? '0.0.0').match(/^(\d+)\.(\d+)\.(\d+)$/);
    if (!match) return '0.1.0';
    return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
  }

  router.get('/', (_req, res) => {
    res.json(read());
  });

  // Full replacement — intended for importing a new weights file after an experiment
  router.put('/', (req, res) => {
    const incoming = req.body;
    if (!incoming?.signals) return res.status(400).json({ error: 'missing signals key' });

    const current = read();
    const version = nextVersion(current);
    incoming._meta = { ...current._meta, ...incoming._meta, version, updated_at: new Date().toISOString() };

    saveWeightVersion(version, incoming, req.body._meta?.label ?? null);
    write(incoming);
    res.json({ version, weights: incoming });
  });

  // Patch a single signal — the common case when one r-value changes after a session
  router.patch('/signals/:key', (req, res) => {
    const { key } = req.params;
    const current = read();

    if (!current.signals[key]) {
      return res.status(404).json({ error: `signal '${key}' not found` });
    }

    const updated = { ...current.signals[key], ...req.body };
    current.signals[key] = updated;

    const version = nextVersion(current);
    current._meta = { ...current._meta, version, updated_at: new Date().toISOString() };

    saveWeightVersion(version, current, req.body.label ?? `updated ${key}`);
    write(current);
    res.json({ version, signal: updated });
  });

  router.get('/history', (_req, res) => {
    res.json(getWeightHistory());
  });

  router.get('/history/:id', (req, res) => {
    const row = getWeightVersion(Number(req.params.id));
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json({ ...row, snapshot: JSON.parse(row.snapshot) });
  });

  router.post('/history/:id/restore', (req, res) => {
    const row = getWeightVersion(Number(req.params.id));
    if (!row) return res.status(404).json({ error: 'not found' });

    const snapshot = JSON.parse(row.snapshot);
    const current = read();
    const version = nextVersion(current);
    snapshot._meta = { ...snapshot._meta, version, updated_at: new Date().toISOString(), restored_from: row.id };

    saveWeightVersion(version, snapshot, `restored from v${row.version}`);
    write(snapshot);
    res.json({ version, weights: snapshot });
  });

  return router;
}
