const MAX_METRICS = 50;
const metricsBuffer = [];
const metricListeners = new Set();

function now() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function isTruthyFlag(value) {
  if (value === true) return true;
  if (value === false || value === null) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "on" || normalized === "yes";
}

function callBooleanFactory(maybeFn) {
  if (typeof maybeFn !== "function") return false;
  try {
    return Boolean(maybeFn());
  } catch {
    return false;
  }
}

function shouldLogDebugFlagPerf() {
  if (typeof window !== "undefined") {
    if (window.__DEBUG_PERF__ === true) return true;
    if (window.__LOG_DEBUG_FLAG_PERF__ === true) return true;
  }
  if (typeof process !== "undefined" && process.env) {
    const { DEBUG_PERF, DEBUG_PERF_LOGS } = process.env;
    if (isTruthyFlag(DEBUG_PERF) || isTruthyFlag(DEBUG_PERF_LOGS)) {
      return true;
    }
  }
  return false;
}

function isProfilingEnabled() {
  if (typeof window !== "undefined") {
    if (window.__PROFILE_DEBUG_FLAGS__ === true) return true;
    if (window.__DEBUG_PERF__ === true) return true;
    if (callBooleanFactory(window.__profileDebugFlags)) return true;
    if (callBooleanFactory(window.__debugPerf)) return true;
  }
  if (typeof process !== "undefined" && process.env) {
    const { DEBUG_FLAG_PERF, DEBUG_PERF } = process.env;
    if (isTruthyFlag(DEBUG_FLAG_PERF) || isTruthyFlag(DEBUG_PERF)) return true;
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
  }
  if (shouldLogDebugFlagPerf() && typeof console !== "undefined") {
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
  notifyMetricListeners();
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
  notifyMetricListeners();
}

function notifyMetricListeners() {
  if (metricListeners.size === 0) return;
  const snapshot = getDebugFlagMetrics();
  metricListeners.forEach((listener) => {
    if (typeof listener !== "function") {
      metricListeners.delete(listener);
      return;
    }
    try {
      listener(snapshot);
    } catch (error) {
      if (typeof console !== "undefined" && console.warn) {
        console.warn("[debugFlagPerf] listener error", error);
      }
    }
  });
}

/**
 * Register a listener for debug flag metrics snapshots.
 *
 * @pseudocode
 * 1. Validate listener is a function.
 * 2. Register listener in metrics listener set.
 * 3. Return unsubscribe function.
 *
 * @param {(metrics: ReturnType<typeof getDebugFlagMetrics>) => void} listener
 *   Listener invoked with the latest metrics snapshot.
 * @returns {() => void} Unsubscribe function.
 */
export function addDebugFlagMetricsListener(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }
  metricListeners.add(listener);
  return () => {
    metricListeners.delete(listener);
  };
}

/**
 * Determine whether debug flag profiling is currently enabled.
 *
 * @pseudocode
 * 1. Delegate to internal `isProfilingEnabled()` function.
 * 2. Return boolean result.
 *
 * @returns {boolean}
 */
export function isDebugFlagProfilingEnabled() {
  return isProfilingEnabled();
}
