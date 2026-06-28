/**
 * Focus/visibility collector — browser-level proxy for application-switch rate.
 * Tracks window focus losses per sample window and cumulative focused time ratio.
 */

export function createFocusCollector(onSample) {
  let focusLosses = 0;
  let focusedMs = 0;
  let lastFocusStart = document.hasFocus() ? performance.now() : null;

  const SAMPLE_INTERVAL_MS = 1000;

  function onFocus() {
    lastFocusStart = performance.now();
  }

  function onBlur() {
    focusLosses++;
    if (lastFocusStart !== null) {
      focusedMs += performance.now() - lastFocusStart;
      lastFocusStart = null;
    }
  }

  function onVisibilityChange() {
    if (document.hidden) onBlur();
    else onFocus();
  }

  let intervalId = null;

  function flush() {
    // Credit any ongoing focused time up to now
    let windowFocusedMs = focusedMs;
    if (lastFocusStart !== null) {
      windowFocusedMs += performance.now() - lastFocusStart;
      lastFocusStart = performance.now(); // reset without losing focus
    }

    onSample({
      type: 'focus',
      ts: Date.now(),
      focus_losses: focusLosses,
      focus_ratio: Math.min(windowFocusedMs / SAMPLE_INTERVAL_MS, 1),
    });

    focusLosses = 0;
    focusedMs = 0;
  }

  return {
    start() {
      window.addEventListener('focus', onFocus);
      window.addEventListener('blur', onBlur);
      document.addEventListener('visibilitychange', onVisibilityChange, { passive: true });
      intervalId = setInterval(flush, SAMPLE_INTERVAL_MS);
    },
    stop() {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearInterval(intervalId);
    },
  };
}
