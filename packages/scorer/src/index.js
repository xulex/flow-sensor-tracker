/**
 * Affect scorer — applies weights to normalized signal z-scores.
 *
 * Weights are loaded dynamically from the weights file on each call so
 * in-person experiment updates take effect immediately without restart.
 * Call setWeightsPath() once at startup; the scorer re-reads the file
 * on each invocation (the OS caches the inode — cost is negligible).
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

let weightsPath = resolve(process.cwd(), '../../weights/table12.json');

export function setWeightsPath(p) {
  weightsPath = resolve(p);
}

function loadWeights() {
  return JSON.parse(readFileSync(weightsPath, 'utf8'));
}

export function score(normalizedSample) {
  const weights = loadWeights();
  const signals = weights.signals;

  const result = {
    ts: normalizedSample.ts,
    sessionId: normalizedSample.sessionId,
    weights_version: weights._meta?.version ?? null,
    dimensions: {},
    raw: normalizedSample,
  };

  // Frustration: negative mouse speed drift from baseline
  if (normalizedSample.mouse_speed_z !== undefined && signals.mouse_speed_below_baseline.enabled) {
    result.dimensions.frustration =
      -normalizedSample.mouse_speed_z * Math.abs(signals.mouse_speed_below_baseline.weight);
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
    result.dimensions.engagement =
      normalizedSample.keystroke_rate_z * signals.keystroke_rate.weight;
  }

  // Focus: window focus ratio (proxy for application-switch rate)
  if (normalizedSample.focus_ratio_z !== undefined && signals.application_switch_rate.enabled) {
    result.dimensions.focus =
      normalizedSample.focus_ratio_z * Math.abs(signals.application_switch_rate.weight);
  }

  return result;
}
