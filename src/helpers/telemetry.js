/**
 * Lightweight telemetry/event logging helper.
 * Dispatches a window event and logs to console for quick observability.
 * In production, this can be wired to analytics.
 *
 * @param {string} name
 * @param {Record<string, any>} [payload]
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export function logEvent(name, payload = {}) {
  try {
    const evt = new CustomEvent("telemetry", { detail: { name, payload, ts: Date.now() } });
    window.dispatchEvent(evt);
  } catch {}
  try {
    // Keep logs terse to avoid test noise
    console.info(`[telemetry] ${name}`, payload || {});
  } catch {}
}
