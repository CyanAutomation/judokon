/**
 * Capture an error with the global Sentry SDK when available.
 *
 * @param {unknown} error - Error object or detail to record.
 * @param {{ contexts?: Record<string, any>, level?: string }} [context] - Optional metadata forwarded to Sentry.
 * @returns {void}
 * @pseudocode
 * 1. Attempt to read `Sentry` from `window` or `globalThis`.
 * 2. When `captureException` is available, invoke it with the supplied context.
 * 3. Swallow failures to keep logging best-effort.
 */
export function captureException(error, context = {}) {
  try {
    const sentry =
      (typeof window !== "undefined" && window.Sentry) ||
      (typeof globalThis !== "undefined" && globalThis.Sentry);
    if (sentry && typeof sentry.captureException === "function") {
      sentry.captureException(error, context);
    }
  } catch {
    // Ignore capture failures; logging should never crash the UI.
  }
}
