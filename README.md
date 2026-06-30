# flow-sensor/tracker

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](../../CHANGELOG.md)

A zero-dependency browser snippet that senses **affective drift** — frustration,
cognitive load, engagement, and focus — from the way a user moves the mouse and
types, relative to their own baseline. One script tag. No PII collected.

> This is the open-source tracker component of **flow-sensor**.
> The scoring engine and server are maintained separately.

---

## Install

Drop one tag into any HTML page:

```html
<script src="https://your-flow-sensor-server/flow-sensor.js"
        data-endpoint="https://your-flow-sensor-server"
        data-site-id="my-site"></script>
```

That's it. The snippet self-initialises, builds a personal baseline during the
first ~30 seconds of interaction, then streams scored samples to your server via
WebSocket.

### Listen to scores in the page

If you want to react to affect scores in real time (e.g., to adapt the UI):

```js
// The tracker exposes a WebSocket connection that echoes scored dimensions back.
// Connect to the same endpoint and listen for score messages:
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
no mouse coordinates, no screenshots, no identifiers beyond the session token.

| Signal | How it is captured | Sampling |
|---|---|---|
| Mouse speed | Distance / time between `mousemove` events | 1 Hz |
| Mouse travel distance | Cumulative pixel distance per window | 1 Hz |
| Mouse direction changes | Direction-angle delta > 45° | 1 Hz |
| Keystroke rate | Count of `keydown` events (no content) | 1 Hz |
| Window focus ratio | Page Visibility API + `blur`/`focus` events | 1 Hz |

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

## Signal weights and the research behind this

The weighting model comes from a master's thesis calibration study (N = 13,
26-minute analytical knowledge-work task):

> *"I'm Not a Robot: repurposing UEBA telemetry to sense affect and protect Flow
> in knowledge work"* — Norton Amato, Steinbeis University / BSCL, 2026
> [![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.20976219.svg)](https://doi.org/10.5281/zenodo.20976219)

The study found that standard cybersecurity UEBA telemetry — the same signals
a security stack already collects to detect intruders — carries detectable
affect signal when expressed within-person. The headline finding:

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
  each page load (`siteId + timestamp + random`).
- Data stays on your own server. Nothing is sent to third parties.

Depending on your jurisdiction, you may still need to disclose behavioral
telemetry in your privacy policy. Consult your legal team.

---

## Research participation

By installing flow-sensor on your site, you participate in an ongoing
calibration study aimed at validating and expanding the original thesis findings
to real-world conditions. Your site's data contributes only as **anonymized
aggregates** (average affect scores per element type) — no sessions, no raw
signals, no site identification ever leaves your siloed partition in that form.

The researcher (Norton Amato) uses these cross-site aggregates to improve the
weight model that benefits all users of the instrument. This is disclosed in the
[Operator Terms](https://github.com/xulex/flow-sensor/blob/main/OPERATOR_TERMS.md).

You are free to stop at any time by removing the script tag.

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

[MIT](../../LICENSE) © 2026 Norton Amato.
