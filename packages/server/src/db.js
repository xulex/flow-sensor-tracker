/**
 * SQLite storage for per-user session records.
 * Schema: sessions + events tables.
 */

import Database from 'better-sqlite3';
import path from 'path';

let db;

export function openDb(dbPath = path.join(process.cwd(), 'data', 'flow-sensor.db')) {
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      site_id TEXT,
      started_at INTEGER,
      last_seen INTEGER
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      ts INTEGER NOT NULL,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      frustration REAL,
      load_effort REAL,
      engagement REAL,
      focus REAL,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
    CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);

    CREATE TABLE IF NOT EXISTS weight_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT NOT NULL,
      saved_at INTEGER NOT NULL,
      label TEXT,
      snapshot TEXT NOT NULL
    );
  `);

  return db;
}

export function upsertSession(sessionId, siteId) {
  const now = Date.now();
  db.prepare(`
    INSERT INTO sessions (id, site_id, started_at, last_seen)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET last_seen = excluded.last_seen
  `).run(sessionId, siteId, now, now);
}

export function insertEvent(scored) {
  db.prepare(`
    INSERT INTO events (session_id, ts, type, payload, frustration, load_effort, engagement, focus)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    scored.sessionId,
    scored.ts,
    scored.raw.type,
    JSON.stringify(scored.raw),
    scored.dimensions.frustration ?? null,
    scored.dimensions.load_effort ?? null,
    scored.dimensions.engagement ?? null,
    scored.dimensions.focus ?? null,
  );
}

export function getSessionSummary(sessionId) {
  return db.prepare(`
    SELECT
      session_id,
      COUNT(*) AS sample_count,
      AVG(frustration) AS avg_frustration,
      AVG(load_effort) AS avg_load,
      AVG(engagement) AS avg_engagement,
      AVG(focus) AS avg_focus,
      MIN(ts) AS started_at,
      MAX(ts) AS last_at
    FROM events WHERE session_id = ?
  `).get(sessionId);
}

export function getAllSessions() {
  return db.prepare(`SELECT * FROM sessions ORDER BY last_seen DESC`).all();
}

export function saveWeightVersion(version, snapshot, label = null) {
  db.prepare(`
    INSERT INTO weight_versions (version, saved_at, label, snapshot)
    VALUES (?, ?, ?, ?)
  `).run(version, Date.now(), label, JSON.stringify(snapshot));
}

export function getWeightHistory() {
  return db.prepare(`
    SELECT id, version, saved_at, label FROM weight_versions ORDER BY saved_at DESC
  `).all();
}

export function getWeightVersion(id) {
  return db.prepare(`SELECT * FROM weight_versions WHERE id = ?`).get(id);
}
