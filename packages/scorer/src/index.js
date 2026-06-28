/**
 * Affect scorer — applies Table 12 weights to normalized signal z-scores.
 * Returns scores for frustration, load/effort, and engagement dimensions.
 */

import weights from '../.././../weights/table12.json' assert { type: 'json' };

const signals = weights.signals;

export function score(normalizedSample) {
  const result = {
    ts: normalizedSample.ts,
    sessionId: normalizedSample.sessionId,
    dimensions: {},
    raw: normalizedSample,
  };

  // Frustration: negative mouse speed drift from baseline
  if (normalizedSample.mouse_speed_z !== undefined && signals.mouse_speed_below_baseline.enabled) {
    // Negative z-score = speed below baseline = frustration signal
    result.dimensions.frustration = -normalizedSample.mouse_speed_z * Math.abs(signals.mouse_speed_below_baseline.weight);
  }

  // Load / effort: travel distance + direction changes deviations
  const distZ = normalizedSample.mouse_distance_z;
  const dirZ = normalizedSample.direction_changes_z;
  if (distZ !== undefined || dirZ !== undefined) {
    const distScore = (distZ ?? 0) * signals.mouse_travel_distance_deviation.weight;
    const dirScore = (dirZ ?? 0) * signals.mouse_direction_changes_deviation.weight;
    result.dimensions.load_effort = (distScore + dirScore) / 2;
  }

  // Engagement: keystroke rate
  if (normalizedSample.keystroke_rate_z !== undefined && signals.keystroke_rate.enabled) {
    result.dimensions.engagement = normalizedSample.keystroke_rate_z * signals.keystroke_rate.weight;
  }

  return result;
}
