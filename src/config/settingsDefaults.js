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

export { DEFAULT_SETTINGS };

/**
 * @typedef {typeof DEFAULT_SETTINGS} Settings
 */
