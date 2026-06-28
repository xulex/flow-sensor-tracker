/**
 * Mouse signal collectors.
 * All values are raw; baseline normalization happens in scorer.
 */

export function createMouseCollector(onSample) {
  let lastX = null, lastY = null, lastTime = null;
  let lastAngle = null;
  let directionChanges = 0;
  let totalDistance = 0;
  let speeds = [];

  const SAMPLE_INTERVAL_MS = 1000;

  function onMove(e) {
    const now = performance.now();
    const x = e.clientX, y = e.clientY;

    if (lastX !== null) {
      const dx = x - lastX, dy = y - lastY;
      const dt = (now - lastTime) / 1000; // seconds
      const dist = Math.sqrt(dx * dx + dy * dy);
      const speed = dt > 0 ? dist / dt : 0;

      totalDistance += dist;
      speeds.push(speed);

      const angle = Math.atan2(dy, dx);
      if (lastAngle !== null) {
        const delta = Math.abs(angle - lastAngle);
        if (delta > Math.PI / 4) directionChanges++;
      }
      lastAngle = angle;
    }

    lastX = x; lastY = y; lastTime = now;
  }

  let intervalId = null;

  function flush() {
    const avgSpeed = speeds.length
      ? speeds.reduce((a, b) => a + b, 0) / speeds.length
      : 0;

    const sample = {
      type: 'mouse',
      ts: Date.now(),
      avg_speed_px_s: avgSpeed,
      travel_distance_px: totalDistance,
      direction_changes: directionChanges,
    };

    directionChanges = 0;
    totalDistance = 0;
    speeds = [];

    onSample(sample);
  }

  return {
    start() {
      document.addEventListener('mousemove', onMove, { passive: true });
      intervalId = setInterval(flush, SAMPLE_INTERVAL_MS);
    },
    stop() {
      document.removeEventListener('mousemove', onMove);
      clearInterval(intervalId);
    },
  };
}
