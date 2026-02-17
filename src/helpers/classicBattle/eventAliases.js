import { getBattleEventTarget } from "./battleEvents.js";
import { createImmutableEventPayload } from "./eventPayloadImmutability.js";
import {
  EVENT_ALIASES as EVENT_ALIASES_FROM_CATALOG,
  LEGACY_EVENT_DEPRECATIONS
} from "./eventCatalog.js";

/**
 * Event Alias System for Backward-Compatible Event Migration
 *
 * Provides aliasing capabilities to gradually migrate from old event names
 * to new standardized naming conventions without breaking existing code.
 *
 * @pseudocode
 * 1. Define mapping of new standardized names to old deprecated names
 * 2. Provide enhanced emit function that fires both new and old events
 * 3. Add deprecation warnings in development mode
 * 4. Support gradual migration by disabling aliases over time
 */

/**
 * Event alias mapping: new standardized name → array of old names
 *
 * This allows multiple old names to map to the same new name during transition
 */
export const EVENT_ALIASES = {
  ...EVENT_ALIASES_FROM_CATALOG
};

/**
 * Reverse mapping: old name → new standardized name
 * Generated from EVENT_ALIASES for quick lookups
 */
export const REVERSE_EVENT_ALIASES = {};

// Build reverse mapping
for (const [newName, oldNames] of Object.entries(EVENT_ALIASES)) {
  for (const oldName of oldNames) {
    REVERSE_EVENT_ALIASES[oldName] = newName;
  }
}

function shouldWarnDeprecated(warnDeprecated) {
  if (warnDeprecated === false) return false;
  const isDev = typeof process !== "undefined" && process.env?.NODE_ENV === "development";
  const isVitest = typeof process !== "undefined" && Boolean(process.env?.VITEST);
  return isDev || isVitest;
}

/**
 * Emit battle events while supporting legacy aliases.
 *
 * @param {string} eventName - Event name, new or deprecated.
 * @param {any} payload - Event payload data.
 * @param {object} options - Emission options.
 * @param {boolean} [options.skipAliases] - Skip emitting alias events.
 * @param {boolean} [options.warnDeprecated] - Disable deprecation warnings when false.
 * @returns {void}
 *
 * @pseudocode
 * 1. Resolve the shared battle event target.
 * 2. Map deprecated names to standardized names and warn when needed.
 * 3. Delegate to `emitEventWithAliases` to fan out to aliases.
 */
export function emitBattleEventWithAliases(eventName, payload, options = {}, eventTarget = null) {
  const target = eventTarget ?? getBattleEventTarget();
  const standardizedName = REVERSE_EVENT_ALIASES[eventName];

  if (standardizedName) {
    if (shouldWarnDeprecated(options.warnDeprecated)) {
      console.warn(`⚠️ Deprecated event name '${eventName}' used. Update to '${standardizedName}'`);
    }
    emitEventWithAliases(target, standardizedName, payload, options);
    return;
  }

  emitEventWithAliases(target, eventName, payload, options);
}

/**
 * Enhanced event emission with backward compatibility aliases
 *
 * @param {EventTarget} eventTarget - Event target to emit on
 * @param {string} eventName - New standardized event name
 * @param {any} payload - Event payload data
 * @param {object} options - Configuration options
 * @param {boolean} options.skipAliases - Skip emitting alias events
 * @param {boolean} options.warnDeprecated - Warn about deprecated usage
 * @returns {void}
 *
 * @pseudocode
 * 1. Dispatch the standardized event on `eventTarget`.
 * 2. Unless `skipAliases`, loop through alias names and dispatch each.
 * 3. Optionally warn in development/test when deprecated aliases are used.
 */
export function emitEventWithAliases(eventTarget, eventName, payload, options = {}) {
  const { skipAliases = false, warnDeprecated = true } = options;

  // Always emit the new standardized event name
  eventTarget.dispatchEvent(
    new CustomEvent(eventName, { detail: createImmutableEventPayload(payload) })
  );

  // Emit backward compatibility aliases unless skipped
  if (!skipAliases) {
    const aliases = EVENT_ALIASES[eventName] || [];

    for (const alias of aliases) {
      // Emit the deprecated alias event
      eventTarget.dispatchEvent(
        new CustomEvent(alias, { detail: createImmutableEventPayload(payload) })
      );

      // Warn about deprecated usage in development
      const isDev =
        typeof process !== "undefined" && process.env && process.env.NODE_ENV === "development";
      const isVitest = typeof process !== "undefined" && process.env && process.env.VITEST;

      if (warnDeprecated && (isDev || isVitest)) {
        console.warn(`⚠️ Deprecated event alias '${alias}' used. Update to '${eventName}'`);
      }
    }
  }
}

/**
 * Create migration helper for updating event names in test files
 *
 * @param {string} oldEventName - Deprecated event name
 * @returns {object} Migration information
 *
 * @pseudocode
 * 1. Look up new name in `REVERSE_EVENT_ALIASES`.
 * 2. Return info indicating whether migration is needed and recommended name.
 */
export function getMigrationInfo(oldEventName) {
  const newName = REVERSE_EVENT_ALIASES[oldEventName];
  const timeline = LEGACY_EVENT_DEPRECATIONS[oldEventName];

  if (!newName) {
    return {
      isDeprecated: false,
      recommendedName: oldEventName,
      migrationNeeded: false
    };
  }

  return {
    isDeprecated: true,
    recommendedName: newName,
    migrationNeeded: true,
    migrationMessage: `Update '${oldEventName}' to '${newName}'`,
    removalTarget: timeline?.removalTarget,
    deprecatedSince: timeline?.deprecatedSince
  };
}

/**
 * Gradual phase-out strategy - disable specific aliases
 *
 * @param {string[]} aliasesToDisable - Array of old event names to stop aliasing
 * @returns {void}
 *
 * @pseudocode
 * 1. For each alias, remove it from the mapping in `EVENT_ALIASES`.
 */
export function disableAliases(aliasesToDisable) {
  for (const alias of aliasesToDisable) {
    const newName = REVERSE_EVENT_ALIASES[alias];
    if (newName && EVENT_ALIASES[newName]) {
      EVENT_ALIASES[newName] = EVENT_ALIASES[newName].filter((a) => a !== alias);
    }
  }
}

/**
 * Get explicit deprecation timeline metadata for a legacy event alias.
 *
 * @param {string} eventName - Legacy alias to inspect.
 * @returns {{canonical: string, deprecatedSince: string, removalTarget: string}|null}
 *
 * @pseudocode
 * 1. Read timeline metadata from `LEGACY_EVENT_DEPRECATIONS`.
 * 2. Return null when the alias is not explicitly scheduled.
 */
export function getLegacyEventDeprecation(eventName) {
  return LEGACY_EVENT_DEPRECATIONS[eventName] || null;
}
/**
 * Development helper to check if event name is deprecated
 *
 * @param {string} eventName - Event name to check
 * @returns {boolean} True if the event name is deprecated
 *
 * @pseudocode
 * 1. Return `true` when `eventName` exists in `REVERSE_EVENT_ALIASES`.
 */
export function isDeprecatedEventName(eventName) {
  return eventName in REVERSE_EVENT_ALIASES;
}
