# flow-sensor

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.1-blue.svg)](https://github.com/xulex/flow-sensor-tracker/releases)
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.20976219.svg)](https://doi.org/10.5281/zenodo.20976219)

A zero-dependency browser snippet that senses **affective drift** — frustration,
cognitive load, engagement, and focus — from the way a user moves the mouse and
types, relative to their own baseline. One script tag. No PII collected.

> This is the open-source tracker component of **flow-sensor**.
> The scoring engine and server are maintained in a private repository.

---

> **Early access** — flow-sensor is currently available on an invitation basis only.
> If you'd like to try it, reach out at [@xulex on X](https://x.com/xulex).

---

## Install

Drop one tag into any HTML page:

```html
<script src="https://your-flow-sensor-server/flow-sensor.js"
        data-endpoint="https://your-flow-sensor-server"
        data-site-id="my-site"></script>
```

That's it. The snippet self-initialises, detects your input device, builds a
personal baseline during the first ~30 seconds of interaction, then scores and
streams samples to your server.

### Options

| Attribute | Required | Description |
|---|---|---|
| `data-endpoint` | Yes | Base URL of your flow-sensor server |
| `data-site-id` | Yes | Identifier for this site (used to silo data) |
| `data-disclosure` | No | Set to `"true"` to show a built-in consent banner |
| `data-disclosure-link` | No | URL to your privacy policy, linked from the banner |

### React to scores in the page

Affect dimensions are scored **locally in the browser** (no server round-trip
needed) and are also echoed back via WebSocket for server-driven use cases:

```js
const ws = new WebSocket('wss://your-flow-sensor-server/stream');
ws.onmessage = ({ data }) => {
  const { type, frustration, load_effort, engagement, focus } = JSON.parse(data);
  if (type === 'score') {
    console.log('Affect state:', { frustration, load_effort, engagement, focus });
  }
};
```

Scores are **within-person z-scores**: positive = above the user's own baseline,
negative = below. A frustration score of −1.5 means the user's mouse has slowed
to 1.5 standard deviations below their quiet-period speed.

### Stop tracking

```js
window.flowSensor.stop();
```

---

## What it collects

All measurements are **behavioral timing and geometry only**. No key content,
no mouse coordinates, no screenshots, no identifiers beyond a session token that
is generated fresh on each page load.

| Signal | How it is captured | Rate |
|---|---|---|
| Mouse speed | Distance / time between `mousemove` events | 1 Hz |
| Mouse travel distance | Cumulative pixel distance per window | 1 Hz |
| Mouse direction changes | Direction-angle delta > 45° | 1 Hz |
| Keystroke rate | Count of `keydown` events (no content captured) | 1 Hz |
| Window focus ratio | Page Visibility API + `blur`/`focus` events | 1 Hz |
| DOM element context | CSS selector at cursor position (no coordinates) | 1 Hz |

Each 1-second sample is z-scored against the user's own session baseline before
it leaves the browser.

---

## How the baseline works

The tracker collects samples during a **30-second warm-up window** before
reporting any scores. During this window it builds a personal mean and standard
deviation for each signal. All subsequent samples are expressed as deviations
from that baseline.

This is the key methodological contribution from the thesis study: suppressing
between-person variance by anchoring every reading to the individual's own
quiet-period behavior makes the signal robust across different users and input
styles.

---

## Peripheral detection

Mouse-movement dynamics differ between an external USB mouse and a trackpad.
The tracker detects which input device is in use from `WheelEvent` characteristics
and stamps every sample with its peripheral context:

| Context | Description |
|---|---|
| `external_mouse` | Scroll wheel with detented steps (`deltaMode === 1`) |
| `trackpad` | Continuous fractional scroll (`deltaMode === 0` + fractional delta) |
| `touch` | Touch events |

Samples are **held in a buffer** until the peripheral locks (3 consistent events),
then retroactively stamped and sent. The server applies the appropriate weight
set per context — currently only `external_mouse` is validated; trackpad and
touch samples are stored for future calibration.

---

## Offline-first design

The tracker is resilient to server downtime:

- **Local scoring** — affect dimensions are computed in the browser using
  weights injected into the script at serve time. No server round-trip is
  needed to produce scores.
- **Auto-reconnect** — the WebSocket reconnects automatically after 3 seconds
  on disconnect. Samples buffer locally until the connection reopens.
- **sendBeacon flush** — on page close or tab switch, any samples not yet
  acknowledged by the server are flushed via `navigator.sendBeacon`. No data
  is lost even if the WebSocket never connected.

---

## Signal weights and the research behind this

The weighting model comes from a master's thesis calibration study (N = 13,
26-minute analytical knowledge-work task):

> *"I'm Not a Robot: repurposing UEBA telemetry to sense affect and protect Flow
> in knowledge work"* — Norton Amato, Steinbeis University / BSCL, 2026
> [![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.20976219.svg)](https://doi.org/10.5281/zenodo.20976219)

The study found that standard cybersecurity UEBA telemetry — the same signals a
security stack already collects to detect intruders — carries detectable affect
signal when expressed within-person. The headline finding:

**Mouse slowing below a participant's own baseline tracks self-reported
frustration** (r = −0.39 to −0.52, held across N = 21–30 samples).

The acquisition pipeline that produced the thesis data is open-source at
[xulex/affect-telemetry](https://github.com/xulex/affect-telemetry).

Weights are continuously updated from ongoing in-person sessions and stored with
full version history in the server.

---

## Build from source

```bash
git clone https://github.com/xulex/flow-sensor-tracker.git
cd flow-sensor-tracker
npm install
npm run build     # → dist/flow-sensor.js
```

Requires Node.js ≥ 18. The build uses [esbuild](https://esbuild.github.io/) —
no other toolchain dependencies.

---

## Privacy

- **No key content is ever captured.** Only the count of keydown events per second.
- **No coordinates are stored or transmitted.** Only derived speed, distance,
  and direction-change counts.
- **No persistent user identifiers.** The session token is generated fresh on
  each page load and is not linked to any account or cookie.
- **DOM element context is structural only.** The tracker records which type of
  element the cursor is near (e.g. `form > button`) — never attribute values,
  text content, or position on screen.
- Data stays on your own server. Nothing is sent to third parties.

Depending on your jurisdiction, you may need to disclose behavioral telemetry in
your privacy policy. Consult your legal team.

---

## Research participation

By installing flow-sensor on your site, you participate in an ongoing calibration
study aimed at validating and expanding the original thesis findings to real-world
conditions. Your site's data contributes only as **anonymized aggregates** —
average affect scores per element type — with no sessions, no raw signals, and
no site identification crossing the data boundary.

The researcher (Norton Amato) uses these cross-site aggregates to improve the
weight model that benefits all users of the instrument. You are free to stop at
any time by removing the script tag.

---

## Citation

If you use this in research, please cite the thesis:

```bibtex
@mastersthesis{amato2026robot,
  author  = {Amato, Norton},
  title   = {{I'm Not a Robot: repurposing UEBA telemetry to sense affect
              and protect Flow in knowledge work}},
  school  = {Steinbeis University / Berlin School of Creative Leadership},
  year    = {2026},
  doi     = {10.5281/zenodo.20976219}
}
```

---

## License

[MIT](LICENSE) © 2026 Norton Amato.
