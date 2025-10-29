import { loadSettings } from "../config/loadSettings.js";
import { updateSetting } from "./settingsStorage.js";
import { setCachedSettings } from "./settingsCache.js";
import { DEFAULT_SETTINGS } from "../config/settingsDefaults.js";

/**
 * Event emitter broadcasting feature flag changes.
 *
 * @summary This `EventTarget` instance serves as a central hub for observing
 * updates to feature flags across the application.
 *
 * @pseudocode
 * 1. A new `EventTarget` instance is created and assigned to `featureFlagsEmitter`.
 * 2. Other parts of the application can subscribe to the `change` event on this emitter to react to feature flag modifications.
 * 3. The `change` event is dispatched by `initFeatureFlags()` when flags are initially loaded, and by `setFlag()` whenever an individual flag's state is altered.
 *
 * @type {EventTarget}
 * @returns {EventTarget}
 */
export const featureFlagsEmitter = new EventTarget();

const supportsCustomEvent = typeof CustomEvent === "function";
const supportsEvent = typeof Event === "function";

/**
 * Safely dispatch a change notification to feature flag listeners.
 *
 * @pseudocode
 * 1. Check if `CustomEvent` is available to construct a DOM-style event with `detail` payload.
 * 2. Otherwise fall back to `Event` (if available) and attach a `detail` property manually.
 * 3. Dispatch the event when `featureFlagsEmitter.dispatchEvent` exists, rethrowing unexpected errors.
 *
 * @param {Record<string, unknown>} detail
 * @returns {void}
 */
function dispatchFeatureFlagChange(detail) {
  const event = supportsCustomEvent
    ? new CustomEvent("change", { detail })
    : supportsEvent
      ? (() => {
          const fallback = new Event("change");
          try {
            Object.defineProperty(fallback, "detail", {
              value: detail,
              configurable: true,
              enumerable: true
            });
          } catch {
            // Some environments expose writable properties, fall back to direct assignment.
            fallback.detail = detail;
          }
          return fallback;
        })()
      : { type: "change", detail };

  if (typeof featureFlagsEmitter.dispatchEvent === "function") {
    try {
      featureFlagsEmitter.dispatchEvent(event);
    } catch (error) {
      // In environments without DOM-style events, dispatchEvent may reject non-Event payloads.
      if (!(error instanceof TypeError)) {
        throw error;
      }
    }
  }
}

let cachedFlags = { ...DEFAULT_SETTINGS.featureFlags };

/**
 * Initialize feature flags from persisted settings.
 *
 * @pseudocode
 * 1. Call `loadSettings()` to retrieve current settings.
 * 2. Set `cachedFlags` and the global settings cache to `settings.featureFlags` or defaults.
 * 3. Dispatch a `change` event with `flag: null`.
 * 4. Return the loaded `settings`.
 *
 * @returns {Promise<import("../config/settingsDefaults.js").Settings>} Loaded settings.
 */
export async function initFeatureFlags() {
  let settings;
  try {
    settings = await loadSettings();
    // Merge defaults with any persisted featureFlags so new flags are present by default
    const mergedFlags = {
      ...DEFAULT_SETTINGS.featureFlags,
      ...(settings.featureFlags || {})
    };
    cachedFlags = mergedFlags;
    // Keep cached settings in sync with the merged map used by `isEnabled`
    setCachedSettings({ ...settings, featureFlags: mergedFlags });
  } catch {
    settings = { ...DEFAULT_SETTINGS };
    cachedFlags = { ...DEFAULT_SETTINGS.featureFlags };
    setCachedSettings(settings);
  }
  dispatchFeatureFlagChange({ flag: null });
  return settings;
}

/**
 * Check whether a feature flag is enabled.
 *
 * @pseudocode
 * 1. If `window.__FF_OVERRIDES` defines `flag`, return its boolean value.
 * 2. Otherwise return `cachedFlags[flag]?.enabled ?? false`.
 *
 * @param {string} flag - Feature flag name.
 * @returns {boolean} True when the flag is enabled.
 */
export function isEnabled(flag) {
  try {
    const w = typeof window !== "undefined" ? window : null;
    const o = w && w.__FF_OVERRIDES;
    if (o && Object.prototype.hasOwnProperty.call(o, flag)) {
      return !!o[flag];
    }
  } catch {}
  return cachedFlags[flag]?.enabled ?? false;
}

/**
 * Update a feature flag and persist the change.
 *
 * @pseudocode
 * 1. Call `loadSettings()` to retrieve current settings.
 * 2. Optionally warn if `flag` is not in `DEFAULT_SETTINGS.featureFlags`.
 * 3. Merge existing flag data with `{ enabled: value }` into `settings.featureFlags`.
 * 4. Persist the merged object with `updateSetting('featureFlags', merged)`.
 * 5. Update `cachedFlags` with the saved flags.
 * 6. Dispatch a `change` event on `featureFlagsEmitter`.
 * 7. Return the updated settings object.
 *
 * @param {string} flag - Feature flag to update.
 * @param {boolean} value - Desired enabled state.
 * @returns {Promise<import("../config/settingsDefaults.js").Settings>} Updated settings.
 */
export async function setFlag(flag, value) {
  const settings = await loadSettings();
  const rawFlags = settings.featureFlags;
  const currentFlags =
    rawFlags && typeof rawFlags === "object" && !Array.isArray(rawFlags) ? rawFlags : {};
  if (!Object.hasOwn(DEFAULT_SETTINGS.featureFlags, flag)) {
    console.warn(`Unknown feature flag: ${flag}`);
  }
  const updatedFlags = {
    ...currentFlags,
    [flag]: { ...(currentFlags[flag] || {}), enabled: value }
  };
  const updated = await updateSetting("featureFlags", updatedFlags);
  cachedFlags = updated.featureFlags || {};
  dispatchFeatureFlagChange({ flag, value });
  return updated;
}

/**
 * Enable a feature flag immediately in-memory and persist asynchronously.
 * Useful for default-on behavior during bootstrap where eventual persistence
 * is acceptable.
 *
 * @pseudocode
 * 1. Merge `{ enabled: true }` into the cached flag entry.
 * 2. Attempt to persist the change by delegating to `setFlag(flag, true)`.
 * 3. Ignore any errors because this helper is invoked in hot paths.
 *
 * @param {string} flag - Feature flag identifier to enable.
 * @returns {void}
 */
export function enableFlag(flag) {
  try {
    cachedFlags = { ...cachedFlags, [flag]: { ...(cachedFlags[flag] || {}), enabled: true } };
  } catch {}
  // Fire-and-forget persistence; ignore errors in hot paths.
  try {
    const persistence = setFlag(flag, true);
    if (typeof persistence?.catch === "function") {
      persistence.catch(() => {});
    }
  } catch {}
}

// Sync changes across tabs by relaying storage events.
if (typeof window !== "undefined") {
  window.addEventListener("storage", async (e) => {
    // First try parsing the newValue payload directly (covering cross-tab updates and custom events)
    if (e.newValue) {
      try {
        const stored = JSON.parse(e.newValue);
        if (stored.featureFlags) {
          const mergedFlags = {
            ...DEFAULT_SETTINGS.featureFlags,
            ...(stored.featureFlags || {})
          };
          cachedFlags = mergedFlags;
          try {
            setCachedSettings({
              ...DEFAULT_SETTINGS,
              ...stored,
              featureFlags: mergedFlags
            });
          } catch {
            // ignore cache update failures to avoid breaking storage sync
          }
          dispatchFeatureFlagChange({ flag: null });
          return;
        }
      } catch {
        // ignore malformed payload
      }
    }
    // Fallback: when settings key changed or parsing failed, reload persisted settings
    if (e.key === "settings") {
      try {
        await initFeatureFlags();
        return;
      } catch {
        // ignore errors
      }
    }
  });
}
