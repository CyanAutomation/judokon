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
  // Timer events
  "timer.roundExpired": ["roundTimeout"],
  "timer.countdownStarted": ["control.countdown.started", "nextRoundCountdownStarted"],
  "timer.countdownFinished": ["countdownFinished"],
  "timer.cooldownExpired": ["cooldown.timer.expired"],

  // UI events
  "ui.statButtonsEnabled": ["statButtons:enable"],
  "ui.statButtonsDisabled": ["statButtons:disable"],
  "ui.countdownStarted": ["nextRoundCountdownStarted"],
  "ui.cardsRevealed": ["cardsRevealed"],

  // State events
  "state.matchOver": ["matchOver"],
  "state.roundStarted": ["roundStarted", "round.started"],
  "state.transitioned": ["control.state.changed"],
  "state.matchConcluded": ["match.concluded"],

  // Player events
  "player.statSelected": ["statSelected"],
  "player.selectionStalled": ["statSelectionStalled"],

  // Scoreboard events
  "scoreboard.messageShown": ["scoreboardShowMessage"],
  "scoreboard.messageCleared": ["scoreboardClearMessage"],

  // Debug events
  "debug.panelUpdated": ["debugPanelUpdate"],
  "debug.stateSnapshot": ["debug.state.snapshot"],

  // Control events
  "control.readinessRequired": ["control.readiness.required"],
  "control.readinessConfirmed": ["control.readiness.confirmed"]
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
 */
export function emitEventWithAliases(eventTarget, eventName, payload, options = {}) {
  const { skipAliases = false, warnDeprecated = true } = options;

  // Always emit the new standardized event name
  eventTarget.dispatchEvent(new CustomEvent(eventName, { detail: payload }));

  // Emit backward compatibility aliases unless skipped
  if (!skipAliases) {
    const aliases = EVENT_ALIASES[eventName] || [];

    for (const alias of aliases) {
      // Emit the deprecated alias event
      eventTarget.dispatchEvent(new CustomEvent(alias, { detail: payload }));

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
 * Enhanced battle event emission with alias support
 *
 * @param {string} eventName - Event name (new or old)
 * @param {any} payload - Event payload
 * @param {object} options - Emission options
 * @returns {void}
 */
export function emitBattleEventWithAliases(eventName, payload, options = {}) {
  // Import the battle event target dynamically to avoid circular deps
  let battleEventTarget;
  try {
    const battleEvents = require("./battleEvents.js");
    battleEventTarget = battleEvents.getBattleEventTarget();
  } catch {
    // Fallback for browser environment - try globalThis
    const EVENT_TARGET_KEY = "__classicBattleEventTarget";
    battleEventTarget = globalThis[EVENT_TARGET_KEY];
    if (!battleEventTarget) {
      console.warn("[eventAliases] Battle event target not found, skipping emission");
      return;
    }
  }

  // Check if this is an old event name being used
  const standardizedName = REVERSE_EVENT_ALIASES[eventName];

  if (standardizedName) {
    // Old name used - emit with standardized name and warn
    const isDev =
      typeof process !== "undefined" && process.env && process.env.NODE_ENV === "development";
    const isVitest = typeof process !== "undefined" && process.env && process.env.VITEST;

    if (options.warnDeprecated !== false && (isDev || isVitest)) {
      console.warn(`⚠️ Deprecated event name '${eventName}' used. Update to '${standardizedName}'`);
    }
    emitEventWithAliases(battleEventTarget, standardizedName, payload, options);
  } else {
    // New name used - emit with aliases
    emitEventWithAliases(battleEventTarget, eventName, payload, options);
  }
}

/**
 * Create migration helper for updating event names in test files
 *
 * @param {string} oldEventName - Deprecated event name
 * @returns {object} Migration information
 */
export function getMigrationInfo(oldEventName) {
  const newName = REVERSE_EVENT_ALIASES[oldEventName];

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
    migrationMessage: `Update '${oldEventName}' to '${newName}'`
  };
}

/**
 * Gradual phase-out strategy - disable specific aliases
 *
 * @param {string[]} aliasesToDisable - Array of old event names to stop aliasing
 * @returns {void}
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
 * Development helper to check if event name is deprecated
 *
 * @param {string} eventName - Event name to check
 * @returns {boolean} True if the event name is deprecated
 */
export function isDeprecatedEventName(eventName) {
  return eventName in REVERSE_EVENT_ALIASES;
}
