import { DEFAULT_SETTINGS } from "../../src/config/settingsDefaults.js";
import { buildFeatureFlagSnapshot } from "../../src/helpers/featureFlagSnapshot.js";

const DEFAULT_TIMEOUT = 5000;
const POLL_INTERVAL_MS = 50;
const DEFAULT_FLAG_MAP = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.featureFlags || {}));

/**
 * Safely instantiate a function from source code using the Function constructor.
 * @param {string} source - The function source code to instantiate.
 * @param {string} [cacheProperty] - Optional window property used to cache the function.
 * @returns {Function|null} The instantiated function or null when instantiation fails.
 */
function instantiateBrowserFunction(source, cacheProperty) {
  if (typeof source !== "string" || !source.trim()) {
    return null;
  }

  let factory;
  try {
    factory = new Function(`return (${source});`);
  } catch {
    return null;
  }

  let candidate;
  try {
    candidate = factory();
  } catch {
    return null;
  }

  if (typeof candidate !== "function") {
    return null;
  }

  if (cacheProperty && typeof window !== "undefined" && window && typeof window === "object") {
    try {
      window[cacheProperty] = candidate;
    } catch {}
  }

  return candidate;
}

const INSTANTIATE_BROWSER_FUNCTION_SOURCE = `(${instantiateBrowserFunction.toString()})`;
const IS_PLAIN_OBJECT_SOURCE = `(value) => value !== null && typeof value === "object" && !Array.isArray(value);`;
const BUILD_FEATURE_FLAG_SNAPSHOT_SOURCE = `(() => {
  const isPlainObject = ${IS_PLAIN_OBJECT_SOURCE};
  return ${buildFeatureFlagSnapshot.toString()};
})()`;

let callbackCounter = 0;

function browserComputeFeatureFlagSnapshot({ defaults, buildSnapshotSource, instantiateSource }) {
  const loadInstantiate = () => {
    if (typeof instantiateSource !== "string") {
      return null;
    }
    try {
      const factory = new Function(`return (${instantiateSource});`);
      const candidate = factory();
      return typeof candidate === "function" ? candidate : null;
    } catch {
      return null;
    }
  };

  const instantiate = loadInstantiate();

  const resolveBuilder = () => {
    if (
      typeof window !== "undefined" &&
      window.__PW_BUILD_FEATURE_FLAG_SNAPSHOT &&
      typeof window.__PW_BUILD_FEATURE_FLAG_SNAPSHOT === "function"
    ) {
      return window.__PW_BUILD_FEATURE_FLAG_SNAPSHOT;
    }
    if (!instantiate) {
      return null;
    }
    return instantiate(buildSnapshotSource, "__PW_BUILD_FEATURE_FLAG_SNAPSHOT");
  };

  const safeDefaults =
    defaults && typeof defaults === "object" && !Array.isArray(defaults) ? defaults : {};
  const buildSnapshot = resolveBuilder();

  const readInspectSnapshot = () => {
    try {
      const inspectApi =
        (typeof window !== "undefined" && window.__TEST_API?.inspect) ||
        (typeof window !== "undefined" && window.__INSPECT_API) ||
        null;
      if (inspectApi && typeof inspectApi.getFeatureFlags === "function") {
        const snapshot = inspectApi.getFeatureFlags();
        if (snapshot && typeof snapshot === "object") {
          return snapshot;
        }
      }
    } catch {}
    return null;
  };

  const readPersistedFeatureFlags = () => {
    try {
      const raw =
        typeof window !== "undefined" &&
        typeof window.localStorage !== "undefined" &&
        typeof window.localStorage.getItem === "function"
          ? window.localStorage.getItem("settings")
          : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.featureFlags === "object" && parsed.featureFlags !== null) {
          return parsed.featureFlags;
        }
      }
    } catch {}
    return {};
  };

  const readOverrides = () => {
    try {
      if (
        typeof window !== "undefined" &&
        window.__FF_OVERRIDES &&
        typeof window.__FF_OVERRIDES === "object"
      ) {
        return window.__FF_OVERRIDES;
      }
    } catch {}
    return {};
  };

  const buildSnapshotSafely = (builder, persisted, overrides) => {
    if (!builder) {
      return null;
    }
    try {
      const snapshot = builder({
        defaults: safeDefaults,
        persisted,
        overrides
      });
      return snapshot && typeof snapshot === "object" ? snapshot : null;
    } catch {
      return null;
    }
  };

  const inspectSnapshot = readInspectSnapshot();
  if (inspectSnapshot) {
    return inspectSnapshot;
  }

  const persisted = readPersistedFeatureFlags();
  const overrides = readOverrides();

  const computed = buildSnapshotSafely(buildSnapshot, persisted, overrides);
  if (computed) {
    return computed;
  }

  return {};
}

const COMPUTE_FEATURE_FLAG_SNAPSHOT_SOURCE = browserComputeFeatureFlagSnapshot.toString();

/**
 * Normalize timeout values passed to helper functions.
 * @param {unknown} value
 * @returns {number}
 */
function resolveTimeout(value) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 0) {
    return numeric;
  }
  return DEFAULT_TIMEOUT;
}

/**
 * Resolve a feature flag enabled state from an inspect snapshot.
 * @param {Record<string, any> | null | undefined} snapshot
 * @param {string} flagName
 * @returns {boolean | null}
 */
export function resolveFeatureFlagEnabled(snapshot, flagName) {
  if (!snapshot || typeof snapshot !== "object") {
    return null;
  }
  const entry = snapshot[flagName];
  if (typeof entry === "boolean") {
    return entry;
  }
  if (entry && typeof entry === "object") {
    if (Object.prototype.hasOwnProperty.call(entry, "enabled")) {
      const { enabled } = entry;
      if (typeof enabled === "boolean") {
        return enabled;
      }
      if (typeof enabled === "string") {
        const normalized = enabled.trim().toLowerCase();
        if (normalized === "true") return true;
        if (normalized === "false") return false;
      }
      if (enabled !== null) {
        return !!enabled;
      }
    }
  }
  return null;
}

/**
 * Read the current feature flag snapshot via the Test API.
 * @param {import("@playwright/test").Page} page
 * @returns {Promise<Record<string, any> | null>}
 */
export async function getFeatureFlagsSnapshot(page) {
  return page.evaluate(
    ({ defaults, computeSnapshotSource, buildSnapshotSource, instantiateSource }) => {
      const loadInstantiate = () => {
        if (typeof instantiateSource !== "string") {
          return null;
        }
        try {
          const factory = new Function(`return (${instantiateSource});`);
          const candidate = factory();
          return typeof candidate === "function" ? candidate : null;
        } catch {
          return null;
        }
      };

      const instantiate = loadInstantiate();

      const resolveCompute = () => {
        if (
          typeof window !== "undefined" &&
          window.__PW_COMPUTE_FEATURE_FLAG_SNAPSHOT &&
          typeof window.__PW_COMPUTE_FEATURE_FLAG_SNAPSHOT === "function"
        ) {
          return window.__PW_COMPUTE_FEATURE_FLAG_SNAPSHOT;
        }
        if (!instantiate) {
          return null;
        }
        return instantiate(computeSnapshotSource, "__PW_COMPUTE_FEATURE_FLAG_SNAPSHOT");
      };

      try {
        const computeSnapshot = resolveCompute();
        if (computeSnapshot) {
          const snapshot = computeSnapshot({
            defaults,
            buildSnapshotSource,
            instantiateSource
          });
          if (snapshot && typeof snapshot === "object") {
            return snapshot;
          }
        }
      } catch {}

      return {};
    },
    {
      defaults: DEFAULT_FLAG_MAP,
      computeSnapshotSource: COMPUTE_FEATURE_FLAG_SNAPSHOT_SOURCE,
      buildSnapshotSource: BUILD_FEATURE_FLAG_SNAPSHOT_SOURCE,
      instantiateSource: INSTANTIATE_BROWSER_FUNCTION_SOURCE
    }
  );
}

/**
 * Delay helper that resolves after the provided number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function delay(ms) {
  const clamped = Math.max(0, Number(ms) || 0);
  return new Promise((resolve) => {
    setTimeout(resolve, clamped);
  });
}

/**
 * Subscribe to feature flag change events via the featureFlagsEmitter.
 * @param {import("@playwright/test").Page} page
 * @param {(snapshot: Record<string, any> | null) => boolean} predicate
 * @param {number} deadline
 * @returns {Promise<Record<string, any> | null>}
 */
async function subscribeToFeatureFlagChanges(page, predicate, deadline) {
  const callbackName = `__pwFeatureFlags_${++callbackCounter}`;

  const cleanup = async () => {
    try {
      await page.evaluate(
        ({ callbackName }) => {
          try {
            const registry = window.__PW_FEATURE_FLAG_HANDLERS;
            const entry = registry?.[callbackName];
            if (entry?.emitter && typeof entry.emitter.removeEventListener === "function") {
              entry.emitter.removeEventListener("change", entry.handler);
            }
            if (registry && Object.prototype.hasOwnProperty.call(registry, callbackName)) {
              delete registry[callbackName];
            }
          } catch {}
          try {
            delete window[callbackName];
          } catch {
            window[callbackName] = undefined;
          }
        },
        { callbackName }
      );
    } catch {}
  };

  let resolveWait;
  let rejectWait;
  let resolved = false;
  const waitPromise = new Promise((resolve, reject) => {
    resolveWait = resolve;
    rejectWait = reject;
  });

  const finalize = (snapshot, error) => {
    if (resolved) {
      return;
    }
    resolved = true;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    cleanup()
      .catch(() => {})
      .finally(() => {
        if (error) {
          rejectWait(error);
        } else {
          resolveWait(snapshot);
        }
      });
  };

  let timeoutId;

  try {
    await page.exposeFunction(callbackName, (payload) => {
      const snapshot = payload?.snapshot ?? null;
      if (predicate(snapshot)) {
        finalize(snapshot, null);
      }
    });
  } catch (error) {
    finalize(
      null,
      error instanceof Error ? error : new Error(String(error ?? "exposeFunction failed"))
    );
    return waitPromise;
  }

  let subscribed = false;
  try {
    subscribed = await page.evaluate(
      ({
        callbackName,
        defaults,
        computeSnapshotSource,
        buildSnapshotSource,
        instantiateSource
      }) => {
        const loadInstantiate = () => {
          if (typeof instantiateSource !== "string") {
            return null;
          }
          try {
            const factory = new Function(`return (${instantiateSource});`);
            const candidate = factory();
            return typeof candidate === "function" ? candidate : null;
          } catch {
            return null;
          }
        };

        const instantiate = loadInstantiate();

        const resolveCompute = () => {
          if (
            typeof window !== "undefined" &&
            window.__PW_COMPUTE_FEATURE_FLAG_SNAPSHOT &&
            typeof window.__PW_COMPUTE_FEATURE_FLAG_SNAPSHOT === "function"
          ) {
            return window.__PW_COMPUTE_FEATURE_FLAG_SNAPSHOT;
          }
          if (!instantiate) {
            return null;
          }
          return instantiate(computeSnapshotSource, "__PW_COMPUTE_FEATURE_FLAG_SNAPSHOT");
        };

        const computeSnapshot = resolveCompute();

        const emitSnapshot = () => {
          try {
            const snapshot = computeSnapshot
              ? computeSnapshot({
                  defaults,
                  buildSnapshotSource,
                  instantiateSource
                })
              : null;
            window[callbackName]?.({ snapshot });
          } catch {
            window[callbackName]?.({ snapshot: null });
          }
        };

        const inspectApi =
          (typeof window !== "undefined" && window.__TEST_API?.inspect) ||
          (typeof window !== "undefined" && window.__INSPECT_API) ||
          null;
        const emitter =
          inspectApi?.featureFlagsEmitter ||
          (typeof window !== "undefined" ? window.featureFlagsEmitter : undefined);
        if (!emitter || typeof emitter.addEventListener !== "function") {
          emitSnapshot();
          return false;
        }
        const handler = () => {
          emitSnapshot();
        };
        window.__PW_FEATURE_FLAG_HANDLERS = window.__PW_FEATURE_FLAG_HANDLERS || {};
        window.__PW_FEATURE_FLAG_HANDLERS[callbackName] = { handler, emitter };
        emitter.addEventListener("change", handler);
        emitSnapshot();
        return true;
      },
      {
        callbackName,
        defaults: DEFAULT_FLAG_MAP,
        computeSnapshotSource: COMPUTE_FEATURE_FLAG_SNAPSHOT_SOURCE,
        buildSnapshotSource: BUILD_FEATURE_FLAG_SNAPSHOT_SOURCE,
        instantiateSource: INSTANTIATE_BROWSER_FUNCTION_SOURCE
      }
    );
  } catch (error) {
    finalize(null, error instanceof Error ? error : new Error(String(error ?? "subscribe failed")));
    return waitPromise;
  }

  if (!subscribed) {
    finalize(null, null);
    return waitPromise;
  }

  const remaining = Math.max(0, deadline - Date.now());
  if (remaining <= 0) {
    finalize(null, new Error("Timed out waiting for feature flag update event."));
    return waitPromise;
  }

  timeoutId = setTimeout(() => {
    finalize(null, new Error("Timed out waiting for feature flag update event."));
  }, remaining);

  return waitPromise;
}

/**
 * Poll for the predicate to return true against the current feature flag snapshot.
 * @param {import("@playwright/test").Page} page
 * @param {(snapshot: Record<string, any> | null) => boolean} predicate
 * @param {number} deadline
 * @returns {Promise<Record<string, any> | null>}
 */
async function pollForFeatureFlagState(page, predicate, deadline) {
  let snapshot = await getFeatureFlagsSnapshot(page);
  if (predicate(snapshot)) {
    return snapshot;
  }

  while (Date.now() < deadline) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      break;
    }
    await delay(Math.min(POLL_INTERVAL_MS, remaining));
    snapshot = await getFeatureFlagsSnapshot(page);
    if (predicate(snapshot)) {
      return snapshot;
    }
  }

  return null;
}

/**
 * Wait for a feature flag to match the expected enabled state.
 * @param {import("@playwright/test").Page} page
 * @param {string} flagName
 * @param {boolean} expectedEnabled
 * @param {{ timeout?: number }} [options]
 * @returns {Promise<Record<string, any>>}
 */
export async function waitForFeatureFlagState(page, flagName, expectedEnabled, options = {}) {
  const timeout = resolveTimeout(options.timeout);
  const deadline = Date.now() + timeout;
  const predicate = (snapshot) => resolveFeatureFlagEnabled(snapshot, flagName) === expectedEnabled;

  let snapshot = await getFeatureFlagsSnapshot(page);
  if (predicate(snapshot)) {
    return snapshot;
  }

  try {
    const eventSnapshot = await subscribeToFeatureFlagChanges(page, predicate, deadline);
    if (eventSnapshot && predicate(eventSnapshot)) {
      return eventSnapshot;
    }
  } catch (error) {
    if (Date.now() >= deadline) {
      throw error;
    }
  }

  const polledSnapshot = await pollForFeatureFlagState(page, predicate, deadline);
  if (polledSnapshot && predicate(polledSnapshot)) {
    return polledSnapshot;
  }

  throw new Error(
    `Timed out waiting for feature flag "${flagName}" to resolve to ${String(expectedEnabled)}.`
  );
}
