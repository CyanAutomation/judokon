/**
 * Log a lightweight telemetry event.
 *
 * This helper dispatches a `telemetry` window event with a timestamp and
 * writes a terse console.info line for local observability. It's safe to call
 * in environments without `window` or `console`.
 *
 * @pseudocode
 * 1. Attempt to dispatch a `telemetry` CustomEvent on `window` with
 *    `{ name, payload, ts }` in `detail`.
 * 2. Regardless of event dispatch success, call `console.info` with a short
 *    message and the payload to aid debugging and test inspection.
 *
 * @param {string} name - Event name to log.
 * @param {Record<string, any>} [payload={}] - Optional event payload.
 * @returns {void}
 */
export function logEvent(name, payload = {}) {
  try {
    const evt = new CustomEvent("telemetry", { detail: { name, payload, ts: Date.now() } });
    window.dispatchEvent(evt);
  } catch {}
  try {
    // Keep logs terse to avoid test noise. When running under Vitest we skip
    // console output so test reporters don't show repetitive telemetry lines.
    const isVitest = typeof process !== "undefined" && process.env && process.env.VITEST;
    if (!isVitest) {
      console.info(`[telemetry] ${name}`, payload || {});
    }
  } catch {}
}
