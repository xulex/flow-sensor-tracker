# Contributing to flow-sensor/tracker

Thank you for your interest. This tracker is the open-source component of a
research-driven project. Contributions are welcome, with a few guidelines
specific to its research context.

## What belongs here

This repository is intentionally narrow: **browser-side signal collection only**.
The scoring model, weights, and server are maintained separately (private). If
you are proposing a new signal, the question is whether it can be collected
cleanly in a browser and whether there is empirical support for it as an affect
correlate.

Good contributions:
- Bug fixes in existing collectors (mouse, keyboard, focus)
- Performance or accuracy improvements to the baseline estimator
- New browser-accessible signals with a clear literature reference
- Documentation improvements

Out of scope here:
- Changes to scoring weights or the affect model
- Server-side or storage changes
- New affect dimensions (those require an empirical study to validate)

## Development setup

```bash
git clone https://github.com/xulex/flow-sensor-tracker.git
cd flow-sensor-tracker
npm install
npm run build
```

The entry point is `src/index.js`. Each signal is a self-contained module in
`src/signals/`. Adding a new signal means:

1. Create `src/signals/<name>.js` exporting a `create<Name>Collector(onSample)`
   factory that returns `{ start(), stop() }`.
2. Wire it into `src/index.js` alongside the existing collectors.
3. Add a row to the signal table in `README.md` with a literature citation for
   the affect correlation.

## Baseline normalization

All signals pass through `src/baseline.js` before streaming. Please keep new
signals on the same 1 Hz cadence and use the existing `baseline.record()` /
`baseline.normalize()` pattern so the server can score them consistently.

## Privacy constraint

The tracker must never capture content — no key characters, no raw coordinates,
no identifiers beyond the ephemeral session token. Any new signal must be
reducible to a count, rate, or geometric derivative within the browser before
transmission.

## Pull requests

- One signal or fix per PR.
- Include a brief note on why the signal is expected to correlate with affect
  (a paper reference or the thesis is fine).
- The build must pass (`npm run build`) before opening a PR.

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](../../LICENSE).
