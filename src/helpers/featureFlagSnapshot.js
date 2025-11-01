function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * @typedef {boolean | { enabled: boolean }} FeatureFlagValue
 */

/**
 * @typedef {Record<string, FeatureFlagValue>} FeatureFlagMap
 */

/**
 * @typedef {Object} FeatureFlagSnapshotEntry
 * @property {boolean} enabled Indicates whether the flag should be treated as enabled for the UI/runtime.
 * @property {boolean} stored Whether a boolean value was persisted for the flag (true) or inferred from defaults (false).
 * @property {boolean} [override] Present when the flag is explicitly overridden for the current session.
 */

/**
 * @typedef {Object} BuildFeatureFlagSnapshotOptions
 * @property {FeatureFlagMap} [defaults] Default flag values bundled with the application.
 * @property {FeatureFlagMap} [persisted] Values persisted in storage (may be boolean or { enabled }).
 * @property {FeatureFlagMap} [overrides] Session-level overrides applied before runtime evaluation.
 */

/**
 * Compute a normalized feature flag snapshot using defaults, persisted settings, and overrides.
 *
 * @param {BuildFeatureFlagSnapshotOptions} [options]
 * @returns {Record<string, FeatureFlagSnapshotEntry>}
 * @pseudocode Iterate through the union of flag names from defaults, persisted values, and overrides;
 * normalize each source to booleans; prefer override > persisted > default; record whether a stored value
 * existed and include an override marker when applicable.
 */
export function buildFeatureFlagSnapshot(options = {}) {
  const { defaults = {}, persisted = {}, overrides = {} } = options;

  const defaultFlags = isPlainObject(defaults) ? defaults : {};
  const persistedFlags = isPlainObject(persisted) ? persisted : {};
  const overrideFlags = isPlainObject(overrides) ? overrides : {};

  const flagNames = Array.from(
    new Set([
      ...Object.keys(defaultFlags),
      ...Object.keys(persistedFlags),
      ...Object.keys(overrideFlags)
    ])
  );

  const snapshot = {};
  for (const flagName of flagNames) {
    if (!flagName) {
      continue;
    }

    const defaultEntry = defaultFlags[flagName];
    const persistedEntry = persistedFlags[flagName];
    const normalizedPersisted = isPlainObject(persistedEntry)
      ? persistedEntry.enabled
      : persistedEntry;
    const normalizedDefault = isPlainObject(defaultEntry) ? defaultEntry.enabled : defaultEntry;
    const storedIsBoolean = typeof normalizedPersisted === "boolean";
    const normalizedDefaultBoolean =
      typeof normalizedDefault === "boolean" ? normalizedDefault : !!normalizedDefault;
    const storedEnabled = storedIsBoolean ? normalizedPersisted : normalizedDefaultBoolean;
    const hasOverride = Object.prototype.hasOwnProperty.call(overrideFlags, flagName);
    const overrideValue = hasOverride ? overrideFlags[flagName] : undefined;

    const enabled = hasOverride
      ? !!overrideValue
      : typeof storedEnabled === "boolean"
        ? storedEnabled
        : !!normalizedDefault;

    snapshot[flagName] = {
      enabled,
      stored: storedEnabled
    };

    if (hasOverride) {
      snapshot[flagName].override = !!overrideValue;
    }
  }

  return snapshot;
}
