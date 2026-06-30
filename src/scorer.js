/**
 * Client-side scorer — mirrors packages/scorer/src/index.js but reads from
 * window.__flowSensorWeights injected by the server at script-serve time.
 * Falls back gracefully if weights are absent (e.g. local dev, CDN edge cache).
 */

export function createClientScorer() {
  function getContext(peripheralType) {
    const weights = window.__flowSensorWeights;
    if (!weights) return null;
    return weights[peripheralType] ?? null;
  }

  function score(normalizedSample) {
    const peripheralType = normalizedSample.peripheral_type || 'unknown';
    const context = getContext(peripheralType);

    const scoreable = context &&
      (context._meta?.validation_status === 'validated' ||
       context._meta?.validation_status === 'exploratory');

    if (!scoreable) return null;

    const signals = context.signals;
    const dimensions = {};

    // Frustration: negative mouse speed drift
    if (normalizedSample.mouse_speed_z !== undefined && signals.mouse_speed_below_baseline?.enabled) {
      dimensions.frustration =
        -normalizedSample.mouse_speed_z * Math.abs(signals.mouse_speed_below_baseline.weight);
    }

    // Load / effort
    const distZ = normalizedSample.mouse_distance_z;
    const dirZ  = normalizedSample.direction_changes_z;
    if (distZ !== undefined || dirZ !== undefined) {
      const distScore = (distZ ?? 0) * (signals.mouse_travel_distance_deviation?.weight ?? 0);
      const dirScore  = (dirZ  ?? 0) * (signals.mouse_direction_changes_deviation?.weight ?? 0);
      dimensions.load_effort = (distScore + dirScore) / 2;
    }

    // Engagement
    if (normalizedSample.keystroke_rate_z !== undefined && signals.keystroke_rate?.enabled) {
      dimensions.engagement =
        normalizedSample.keystroke_rate_z * signals.keystroke_rate.weight;
    }

    // Focus
    if (normalizedSample.focus_ratio_z !== undefined && signals.application_switch_rate?.enabled) {
      dimensions.focus =
        normalizedSample.focus_ratio_z * Math.abs(signals.application_switch_rate.weight);
    }

    return Object.keys(dimensions).length ? dimensions : null;
  }

  return { score };
}
