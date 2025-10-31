function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Compute a normalized feature flag snapshot using defaults, persisted settings, and overrides.
 * @param {{ defaults?: Record<string, any>, persisted?: Record<string, any>, overrides?: Record<string, any> }} [options]
 * @returns {Record<string, { enabled: boolean, stored: boolean, override?: boolean }>}
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
    const normalizedPersisted = isPlainObject(persistedEntry) ? persistedEntry.enabled : persistedEntry;
    const normalizedDefault = isPlainObject(defaultEntry) ? defaultEntry.enabled : defaultEntry;
    const storedIsBoolean = typeof normalizedPersisted === "boolean";
    const storedEnabled = storedIsBoolean ? normalizedPersisted : normalizedDefault;
    const hasOverride = Object.prototype.hasOwnProperty.call(overrideFlags, flagName);
    const overrideValue = hasOverride ? overrideFlags[flagName] : undefined;

    const enabled = hasOverride
      ? !!overrideValue
      : typeof storedEnabled === "boolean"
        ? storedEnabled
        : !!normalizedDefault;

    snapshot[flagName] = {
      enabled,
      stored: typeof normalizedDefault === "boolean" ? normalizedDefault : !!normalizedDefault
    };

    if (storedIsBoolean) {
      snapshot[flagName].stored = normalizedPersisted;
    }

    if (hasOverride) {
      snapshot[flagName].override = !!overrideValue;
    }
  }

  return snapshot;
}
