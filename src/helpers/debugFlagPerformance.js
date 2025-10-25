const MAX_METRICS = 50;
const metricsBuffer = [];

function now() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function isProfilingEnabled() {
  if (typeof window !== "undefined") {
    if (window.__PROFILE_DEBUG_FLAGS__ === true) return true;
    if (typeof window.__profileDebugFlags === "function") {
      try {
        if (window.__profileDebugFlags()) return true;
      } catch {}
    }
  }
  if (typeof process !== "undefined" && process.env) {
    if (process.env.DEBUG_FLAG_PERF === "1") return true;
  }
  return false;
}

function recordMetric(entry) {
  metricsBuffer.push(entry);
  while (metricsBuffer.length > MAX_METRICS) {
    metricsBuffer.shift();
  }
  if (typeof window !== "undefined") {
    if (!Array.isArray(window.__DEBUG_FLAG_METRICS__)) {
      window.__DEBUG_FLAG_METRICS__ = [];
    }
    window.__DEBUG_FLAG_METRICS__.push(entry);
    while (window.__DEBUG_FLAG_METRICS__.length > MAX_METRICS) {
      window.__DEBUG_FLAG_METRICS__.shift();
    }
    if (window.__LOG_DEBUG_FLAG_PERF__ === true && typeof console !== "undefined") {
      try {
        console.info(
          "[debugFlagPerf]",
          entry.flag,
          "duration:",
          `${entry.duration.toFixed(2)}ms`,
          entry.metadata || ""
        );
      } catch {}
    }
  }
}

/**
 * Measure the execution time of a debug flag toggle when profiling is enabled.
 *
 * @template T
 * @param {string} flag - Name of the feature flag being toggled.
 * @param {() => T} action - Synchronous action to profile.
 * @param {Record<string, unknown>} [metadata] - Optional metadata to include in the metric.
 * @returns {T}
 * @pseudocode
 *   if action is not a function -> return action (as-is, not called)
 *   if profiling is disabled -> return action()
 *   start <- now()
 *   result <- action()
 *   duration <- max(0, now() - start)
 *   recordMetric({ flag, duration, metadata or null, timestamp: Date.now() })
 *   return result
 */
export function measureDebugFlagToggle(flag, action, metadata = undefined) {
  if (typeof action !== "function") {
    return action;
  }
  if (!isProfilingEnabled()) {
    return action();
  }
  const start = now();
  try {
    return action();
  } finally {
    const duration = Math.max(0, now() - start);
    recordMetric({
      flag,
      duration,
      metadata: metadata || null,
      timestamp: Date.now()
    });
  }
}

/**
 * Retrieve recorded debug flag performance metrics.
 *
 * @returns {Array<{flag: string, duration: number, metadata: Record<string, unknown>|null, timestamp: number}>}
 * @pseudocode
 *   return shallow copy of metricsBuffer
 */
export function getDebugFlagMetrics() {
  return metricsBuffer.slice();
}

/**
 * Clear all recorded debug flag performance metrics.
 *
 * @returns {void}
 * @pseudocode
 *   metricsBuffer.length <- 0
 *   if window exists AND window.__DEBUG_FLAG_METRICS__ is an array -> set its length to 0
 */
export function resetDebugFlagMetrics() {
  metricsBuffer.length = 0;
  if (typeof window !== "undefined" && Array.isArray(window.__DEBUG_FLAG_METRICS__)) {
    window.__DEBUG_FLAG_METRICS__.length = 0;
  }
}
