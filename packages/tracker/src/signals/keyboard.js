/**
 * Keyboard signal collector.
 * Tracks keystroke rate (keydowns per second) as an engagement/arousal proxy.
 */

export function createKeyboardCollector(onSample) {
  let keyCount = 0;
  const SAMPLE_INTERVAL_MS = 1000;

  function onKey() { keyCount++; }

  let intervalId = null;

  function flush() {
    onSample({
      type: 'keyboard',
      ts: Date.now(),
      keystrokes_per_second: keyCount,
    });
    keyCount = 0;
  }

  return {
    start() {
      document.addEventListener('keydown', onKey, { passive: true });
      intervalId = setInterval(flush, SAMPLE_INTERVAL_MS);
    },
    stop() {
      document.removeEventListener('keydown', onKey);
      clearInterval(intervalId);
    },
  };
}
