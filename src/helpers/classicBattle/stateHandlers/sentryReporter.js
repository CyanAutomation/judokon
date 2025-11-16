let sentryPromise;

function loadSentry() {
  if (!sentryPromise) {
    try {
      sentryPromise = import("@sentry/browser").catch(() => null);
    } catch {
      sentryPromise = Promise.resolve(null);
    }
  }
  return sentryPromise;
}

/**
 * Lazily load Sentry and forward a captured exception when available.
 *
 * @pseudocode
 * 1. Bail early when no error payload is provided.
 * 2. Kick off the shared dynamic import promise when not yet created.
 * 3. Once resolved, invoke `captureException` when supported and ignore failures.
 *
 * @param {Error|unknown} error - Error object or reason to report.
 * @param {Record<string, unknown>} context - Optional context passed to Sentry.
 * @returns {void}
 */
export function reportSentryError(error, context) {
  if (!error) {
    return;
  }
  try {
    const payload = context && typeof context === "object" ? context : {};
    loadSentry().then((sentry) => {
      try {
        sentry?.captureException?.(error, payload);
      } catch {}
    });
  } catch {}
}
