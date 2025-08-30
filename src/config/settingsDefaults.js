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
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
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
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export { DEFAULT_SETTINGS };

/**
 * @typedef {typeof DEFAULT_SETTINGS} Settings
 */
