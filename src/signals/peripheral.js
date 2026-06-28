/**
 * Peripheral type detector.
 *
 * Uses WheelEvent delta characteristics as the primary signal:
 *   - deltaMode === 1 (DOM_DELTA_LINE) → mouse wheel (stepped, line-based)
 *   - deltaMode === 0 + fractional deltaY → trackpad (smooth pixel scrolling)
 *   - PointerEvent.pointerType === "touch" → touch screen
 *
 * Confidence rises with corroborating evidence and locks after LOCK_THRESHOLD
 * consistent observations. Once locked, the context is fixed for the session.
 *
 * Returns an EventTarget-like object. Listen for the "lock" event to know
 * when the context is settled:
 *
 *   peripheral.on('lock', ({ type, confidence }) => { ... })
 *   peripheral.on('update', ({ type, confidence }) => { ... })  // before lock
 */

const LOCK_THRESHOLD = 3; // consistent wheel observations before we commit

export function createPeripheralDetector() {
  let type = 'unknown';
  let confidence = 'low';
  let locked = false;
  let observations = { external_mouse: 0, trackpad: 0, touch: 0 };
  const listeners = { lock: [], update: [] };

  function emit(event, data) {
    (listeners[event] || []).forEach(fn => fn(data));
  }

  function classify() {
    const total = observations.external_mouse + observations.trackpad + observations.touch;
    if (total === 0) return;

    const dominant = Object.entries(observations).sort((a, b) => b[1] - a[1])[0];
    const dominantType = dominant[0];
    const dominantCount = dominant[1];
    const ratio = dominantCount / total;

    const newType = dominantType;
    const newConfidence = ratio >= 0.9 ? 'high' : ratio >= 0.7 ? 'medium' : 'low';

    const changed = newType !== type || newConfidence !== confidence;
    type = newType;
    confidence = newConfidence;

    if (!locked) emit('update', { type, confidence });

    // Lock once we have LOCK_THRESHOLD high-confidence consistent observations
    if (!locked && dominantCount >= LOCK_THRESHOLD && newConfidence === 'high') {
      locked = true;
      emit('lock', { type, confidence });
    }

    return changed;
  }

  function onWheel(e) {
    if (locked) return;

    if (e.pointerType === 'touch' || e.deltaMode === 2) {
      // DOM_DELTA_PAGE or explicit touch
      observations.touch++;
    } else if (e.deltaMode === 1) {
      // DOM_DELTA_LINE — classic mouse wheel
      observations.external_mouse++;
    } else if (e.deltaMode === 0) {
      // DOM_DELTA_PIXEL — could be either, but fractional = trackpad
      const fractional = !Number.isInteger(e.deltaY) || !Number.isInteger(e.deltaX);
      const small = Math.abs(e.deltaY) < 10 && Math.abs(e.deltaX) < 10;
      if (fractional || small) {
        observations.trackpad++;
      } else {
        // Large integer pixel deltas — some mice report this way
        observations.external_mouse++;
      }
    }

    classify();
  }

  function onPointerDown(e) {
    if (locked) return;
    if (e.pointerType === 'touch') {
      observations.touch += 2; // strong signal
      classify();
    }
  }

  return {
    get type() { return type; },
    get confidence() { return confidence; },
    get locked() { return locked; },

    on(event, fn) { (listeners[event] = listeners[event] || []).push(fn); return this; },

    start() {
      window.addEventListener('wheel', onWheel, { passive: true });
      window.addEventListener('pointerdown', onPointerDown, { passive: true });
    },
    stop() {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('pointerdown', onPointerDown);
    },
  };
}
