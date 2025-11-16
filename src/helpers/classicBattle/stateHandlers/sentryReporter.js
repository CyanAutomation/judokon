let sentryPromise;

function getGlobalScope() {
  if (typeof globalThis !== "undefined") {
    return globalThis;
  }
  if (typeof window !== "undefined") {
    return window;
  }
  return undefined;
}

function getConfiguredSentry() {
  try {
    const scope = getGlobalScope();
    if (scope?.Sentry && typeof scope.Sentry.captureException === "function") {
      return scope.Sentry;
    }
  } catch {}
  return null;
}

function normalizeSentryModule(module) {
  if (!module) {
    return null;
  }
  if (module.default && typeof module.default.captureException === "function") {
    return module.default;
  }
  return module;
}

function initSentryIfNeeded(sentry) {
  if (!sentry) {
    return null;
  }
  try {
    const hub = typeof sentry.getCurrentHub === "function" ? sentry.getCurrentHub() : null;
    const hasClient = typeof hub?.getClient === "function" && Boolean(hub.getClient());
    if (
      hasClient ||
      typeof sentry.init !== "function" ||
      (typeof sentry.isInitialized === "function" && sentry.isInitialized() && hasClient)
    ) {
      return sentry;
    }
    const scope = getGlobalScope();
    const env =
      typeof process !== "undefined" && process.env
        ? {
            SENTRY_DSN: process.env.SENTRY_DSN,
            VITE_SENTRY_DSN: process.env.VITE_SENTRY_DSN,
            SENTRY_RELEASE: process.env.SENTRY_RELEASE,
            VITE_SENTRY_RELEASE: process.env.VITE_SENTRY_RELEASE,
            SENTRY_TRACES_SAMPLE_RATE: process.env.SENTRY_TRACES_SAMPLE_RATE,
          }
        : {};
    const dsn = scope?.__SENTRY_DSN__ ?? env.SENTRY_DSN ?? env.VITE_SENTRY_DSN;
    if (!dsn) {
      return sentry;
    }
    const release = scope?.__SENTRY_RELEASE__ ?? env.SENTRY_RELEASE ?? env.VITE_SENTRY_RELEASE;
    const sample = scope?.__SENTRY_TRACES_SAMPLE_RATE__ ?? env.SENTRY_TRACES_SAMPLE_RATE;
    const options = { dsn };
    if (release) {
      options.release = release;
    }
    if (sample && !Number.isNaN(Number(sample))) {
      options.tracesSampleRate = Number(sample);
    }
    sentry.init(options);
  } catch {}
  return sentry;
}

function loadSentry() {
  const configured = getConfiguredSentry();
  if (configured) {
    return Promise.resolve(configured);
  }
  if (!sentryPromise) {
    try {
      sentryPromise = import("@sentry/browser")
        .then((module) => initSentryIfNeeded(normalizeSentryModule(module)))
        .catch(() => null);
    } catch {
      sentryPromise = Promise.resolve(null);
    }
  }
  return sentryPromise;
}

function captureWithSentry(sentry, error, payload) {
  if (!sentry || !error) {
    return;
  }
  try {
    sentry.captureException?.(error, payload);
  } catch {}
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
    const configured = getConfiguredSentry();
    if (configured) {
      captureWithSentry(configured, error, payload);
      return;
    }
    loadSentry()
      .then((sentry) => {
        captureWithSentry(sentry ?? getConfiguredSentry(), error, payload);
      })
      .catch(() => {
        /* ignore loader errors */
      });
  } catch {}
}
