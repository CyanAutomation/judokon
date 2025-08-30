import settings from "../data/settings.json" with { type: "json" };

function deepFreeze(obj) {
  Object.values(obj).forEach((value) => {
    if (value && typeof value === "object") {
      deepFreeze(value);
    }
  });
  return Object.freeze(obj);
}

const DEFAULT_SETTINGS = deepFreeze(settings);

/**
 * Default application settings loaded from `data/settings.json`.
 *
 * @summary Frozen default settings object used as the canonical schema for runtime defaults.
 * @pseudocode
 * 1. Load settings JSON and deep-freeze the object to prevent runtime mutation.
 * 2. Export the frozen object as `DEFAULT_SETTINGS` for consumers.
 * @returns {object}
 */
export { DEFAULT_SETTINGS };

/**
 * @typedef {typeof DEFAULT_SETTINGS} Settings
 */
