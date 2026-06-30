/**
 * flow-sensor tracker — drop-in <script> tag for any website.
 *
 * Usage:
 *   <script src="https://your-server/flow-sensor.js"
 *           data-endpoint="https://your-server"
 *           data-site-id="my-site"
 *           data-disclosure="true"
 *           data-disclosure-link="https://example.com/privacy"></script>
 */

import { createMouseCollector }    from './signals/mouse.js';
import { createKeyboardCollector } from './signals/keyboard.js';
import { createFocusCollector }    from './signals/focus.js';
import { createPeripheralDetector } from './signals/peripheral.js';
import { createElementTracker }    from './signals/element.js';
import { createBaseline }          from './baseline.js';
import { createStreamer }           from './streamer.js';
import { maybeShowDisclosure }     from './disclosure.js';

(function () {
  const script = document.currentScript;
  const endpoint = script?.dataset.endpoint || 'http://localhost:3000';
  const siteId   = script?.dataset.siteId   || 'default';
  const sessionId = `${siteId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  maybeShowDisclosure(script);

  const baseline   = createBaseline();
  const streamer   = createStreamer(endpoint, sessionId);
  const peripheral = createPeripheralDetector();
  const element    = createElementTracker();

  const pendingBuffer = [];
  const MAX_BUFFER = 60;

  function buildSample(raw) {
    const normalized = { ...raw };

    if (raw.type === 'mouse') {
      baseline.record('mouse_speed',            raw.avg_speed_px_s);
      baseline.record('mouse_distance',         raw.travel_distance_px);
      baseline.record('mouse_direction_changes', raw.direction_changes);

      if (baseline.isReady('mouse_speed')) {
        normalized.mouse_speed_z        = baseline.normalize('mouse_speed',            raw.avg_speed_px_s);
        normalized.mouse_distance_z     = baseline.normalize('mouse_distance',         raw.travel_distance_px);
        normalized.direction_changes_z  = baseline.normalize('mouse_direction_changes', raw.direction_changes);
      }

      // Attach element context to every mouse sample
      const ctx = element.sample();
      if (ctx) Object.assign(normalized, ctx);
    }

    if (raw.type === 'keyboard') {
      baseline.record('keystroke_rate', raw.keystrokes_per_second);
      if (baseline.isReady('keystroke_rate')) {
        normalized.keystroke_rate_z = baseline.normalize('keystroke_rate', raw.keystrokes_per_second);
      }
    }

    if (raw.type === 'focus') {
      baseline.record('focus_ratio', raw.focus_ratio);
      if (baseline.isReady('focus_ratio')) {
        normalized.focus_ratio_z = baseline.normalize('focus_ratio', raw.focus_ratio);
      }
    }

    return normalized;
  }

  function stamp(sample) {
    return {
      ...sample,
      peripheral_type:       peripheral.type,
      peripheral_confidence: peripheral.confidence,
      peripheral_locked:     peripheral.locked,
    };
  }

  function onSample(raw) {
    const normalized = buildSample(raw);

    if (!peripheral.locked) {
      if (pendingBuffer.length < MAX_BUFFER) pendingBuffer.push(normalized);
      return;
    }

    streamer.send(stamp(normalized));
  }

  peripheral.on('lock', ({ type, confidence }) => {
    while (pendingBuffer.length) {
      streamer.send({
        ...pendingBuffer.shift(),
        peripheral_type:       type,
        peripheral_confidence: confidence,
        peripheral_locked:     true,
        retrograde:            true,
      });
    }
  });

  const mouse    = createMouseCollector(onSample);
  const keyboard = createKeyboardCollector(onSample);
  const focus    = createFocusCollector(onSample);

  streamer.start();
  peripheral.start();
  element.start();
  mouse.start();
  keyboard.start();
  focus.start();

  window.flowSensor = {
    get peripheral() { return { type: peripheral.type, confidence: peripheral.confidence }; },
    stop() { mouse.stop(); keyboard.stop(); focus.stop(); element.stop(); peripheral.stop(); streamer.stop(); },
  };
})();
