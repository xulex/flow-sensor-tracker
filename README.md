# flow-sensor

Real-time affective behavioral analytics — a drop-in `<script>` tag for any website.

Inspired by UEBA (User and Entity Behavior Analytics) and thesis findings on behavioral correlates of affect (Table 12). Instead of flagging intruders, flow-sensor tracks *affective drift* — frustration, cognitive load, and engagement — from mouse and keyboard signals, relative to each user's personal baseline.

## Quick start

```html
<!-- Drop into any page -->
<script src="https://your-server/flow-sensor.js"
        data-endpoint="https://your-server"
        data-site-id="my-site"></script>
```

## Signal weights (Table 12)

| Signal | Indexes | Weight (r) | Role |
|---|---|---|---|
| Mouse speed ↓ baseline | Frustration | −0.39 to −0.52 | Primary frustration flag |
| Mouse travel distance (dev.) | Effort / load | +0.58 | Load index |
| Mouse direction changes (dev.) | Effort / load | +0.50 | Load index (corrective motion) |
| Keystroke rate | Arousal / engagement | +0.10 to +0.25 | Engagement proxy |
| Heart-rate deviation | Effort | +0.43 | Disabled — needs HR sensor |
| App-switch rate | Focus | −0.22 | Disabled — not browser-trackable |

All weights are within-person and baseline-relative (z-scored per session).

## Architecture

```
packages/
  tracker/   — browser snippet; collects mouse + keyboard signals, streams via WebSocket
  scorer/    — applies Table 12 weights to z-scored signals → affect dimensions
  server/    — Node.js: WebSocket ingest, SQLite storage, REST API
weights/
  table12.json — authoritative weight file (edit to retune)
```

## API

| Endpoint | Description |
|---|---|
| `WS /stream` | Receive raw samples; returns scored dimensions in real-time |
| `GET /api/sessions` | List all recorded sessions |
| `GET /api/sessions/:id` | Summary stats for one session |

## Development

```bash
npm install
npm run build   # bundle tracker snippet
npm run dev     # start server with auto-reload
```
