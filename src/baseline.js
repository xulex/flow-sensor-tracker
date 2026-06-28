/**
 * Per-session baseline estimator.
 * Collects samples during a quiet warm-up window, then provides
 * within-person z-score normalization for each signal.
 */

const WARMUP_SAMPLES = 30; // ~30 seconds at 1 Hz

export function createBaseline() {
  const buckets = {}; // signal_key -> number[]

  function push(key, value) {
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(value);
  }

  function stats(key) {
    const vals = buckets[key] || [];
    if (vals.length < 2) return { mean: 0, sd: 1 };
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
    return { mean, sd: Math.sqrt(variance) || 1 };
  }

  return {
    isReady(key) {
      return (buckets[key] || []).length >= WARMUP_SAMPLES;
    },
    record(key, value) {
      push(key, value);
    },
    normalize(key, value) {
      const { mean, sd } = stats(key);
      return (value - mean) / sd; // z-score
    },
  };
}
