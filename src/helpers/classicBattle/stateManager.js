import { CLASSIC_BATTLE_STATES } from "./stateTable.js";
import { debugLog, shouldSuppressDebugOutput } from "./debugLog.js";
import { error as logError, warn as logWarn, debug as logDebug } from "../logger.js";
import { isEnabled } from "../featureFlags.js";

const IS_VITEST = typeof process !== "undefined" && !!process.env?.VITEST;

// Constants
const DEFAULT_INITIAL_STATE = "waitingForMatchStart";
const VALIDATION_WARN_ENABLED = true;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build a lookup map from state table and find initial state.
 *
 * @param {Array} stateTable - Array of state definitions.
 * @returns {{byName: Map, initialState: string}} State lookup map and initial state name.
 */
function initializeStateTable(stateTable) {
  const byName = new Map();
  let initialState = null;

  for (const s of Array.isArray(stateTable) ? stateTable : []) {
    byName.set(s.name, s);
    if (s.type === "initial") {
      initialState = s.name;
    }
  }

  if (!initialState) {
    initialState = DEFAULT_INITIAL_STATE;
  }

  return { byName, initialState };
}

/**
 * Build a trigger lookup map for fast O(1) access to transitions.
 *
 * Note: This map is used as a fast path for triggers without guards.
 * When guards are present, dispatch() will fall back to linear search through triggers array.
 *
 * @param {Map} statesByName - State lookup map.
 * @returns {Map} Map of "stateName:eventName" -> target state (only for unguarded triggers).
 */
function buildTriggerMap(statesByName) {
  const triggerMap = new Map();

  for (const [stateName, stateDef] of statesByName) {
    for (const trigger of stateDef.triggers || []) {
      // Only add unguarded triggers to the fast-path map
      // Guarded triggers must be evaluated in dispatch()
      if (!trigger.guard) {
        const key = `${stateName}:${trigger.on}`;
        triggerMap.set(key, trigger.target);
      }
    }
  }

  return triggerMap;
}

/**
 * Evaluate a guard condition.
 *
 * @pseudocode
 * 1. Handle null/empty guards (pass by default).
 * 2. Parse negation prefix (e.g., "!guardName").
 * 3. Evaluate known guard types:
 *    - Feature flags: autoSelectEnabled, FF_ROUND_MODIFY
 *    - Score-based: playerScore >= winTarget || opponentScore >= winTarget
 * 4. Return result, applying negation if present.
 *
 * @param {string} guard - Guard condition string (e.g., "autoSelectEnabled", "playerScore >= winTarget || opponentScore >= winTarget").
 * @param {object} context - State machine context with optional engine.
 * @returns {boolean} True if guard passes, false otherwise.
 */
function evaluateGuard(guard, context) {
  if (!guard || typeof guard !== "string") {
    return true; // No guard means always pass
  }

  // Handle negation
  const isNegated = guard.startsWith("!");
  const guardName = isNegated ? guard.slice(1) : guard;

  let result = false;

  // Evaluate known guards
  switch (guardName) {
    case "autoSelectEnabled":
      result = isEnabled("autoSelect") === true;
      break;
    case "FF_ROUND_MODIFY":
      result = isEnabled("roundModify") === true;
      break;
    case "playerScore >= winTarget || opponentScore >= winTarget": {
      // Score-based guard: check if either player has reached their win target
      if (!context?.engine) {
        logWarn("evaluateGuard: WIN_CONDITION_MET guard evaluated but context.engine is missing");
        result = false;
        break;
      }

      const scores = context.engine.getScores?.();
      const pointsToWin = context.engine.pointsToWin;

      if (!scores || typeof pointsToWin !== "number") {
        logWarn(
          "evaluateGuard: WIN_CONDITION_MET guard evaluated but scores or pointsToWin is missing",
          { scores, pointsToWin }
        );
        result = false;
        break;
      }

      const { playerScore, opponentScore } = scores;
      result = playerScore >= pointsToWin || opponentScore >= pointsToWin;
      break;
    }
    default:
      // Unknown guard - log warning and default to false for safety
      logWarn(`Unknown guard condition: ${guardName}`);
      result = false;
  }

  return isNegated ? !result : result;
}

/**
 * Get available trigger event names for a given state.
 *
 * @param {object} stateDef - State definition.
 * @returns {string[]} Array of event names.
 */
function getAvailableTriggers(stateDef) {
  return (stateDef?.triggers || []).map((t) => t.on);
}

/**
 * Validate state table structure.
 *
 * @param {Array} stateTable - Array of state definitions.
 * @returns {boolean} True if valid, logs errors if not.
 */
function validateStateTable(stateTable) {
  if (!Array.isArray(stateTable)) {
    logError("State table must be an array");
    return false;
  }

  // Empty state table is allowed and will default to initial state
  if (stateTable.length === 0) {
    return true;
  }

  for (const state of stateTable) {
    if (!state.name || typeof state.name !== "string") {
      logError(`State entry missing 'name' property: ${JSON.stringify(state)}`);
      return false;
    }
  }

  return true;
}

/**
 * Validate context object structure.
 *
 * @param {any} context - Context object to validate.
 * @returns {boolean} True if valid.
 */
function validateContext(context) {
  if (context !== null && typeof context !== "object") {
    logError(`Invalid context: expected object, got ${typeof context}`);
    return false;
  }
  return true;
}

/**
 * Validate a state transition against allowed triggers.
 *
 * @pseudocode
 * 1. Look up from/to state definitions, return false if missing.
 * 2. Check if event is allowed via triggers from current state.
 * 3. Optionally warn if event is unexpected but still return true.
 *
 * @param {string} fromState - Current state name.
 * @param {string} toState - Target state name.
 * @param {string} eventName - Triggering event name.
 * @param {Map} statesByName - State lookup map.
 * @returns {boolean} True if valid, false if invalid.
 */
function validateStateTransition(fromState, toState, eventName, statesByName) {
  const fromStateDef = statesByName.get(fromState);
  if (!fromStateDef) {
    logError(`State validation error: Unknown fromState '${fromState}'`);
    return false;
  }

  const toStateDef = statesByName.get(toState);
  if (!toStateDef) {
    logError(`State validation error: Unknown toState '${toState}'`);
    return false;
  }

  // Check if the event is allowed from the current state
  const validTrigger = fromStateDef.triggers?.find(
    (t) => t.on === eventName && t.target === toState
  );

  if (!validTrigger && VALIDATION_WARN_ENABLED) {
    logWarn(
      `State validation warning: Event '${eventName}' may not be valid from '${fromState}' to '${toState}'`
    );
  }

  // Resilience: warn but don't fail
  return true;
}

/**
 * Run onEnter handler for a state, with error suppression in tests.
 *
 * @param {string} stateName - State name.
 * @param {object} machine - Machine reference.
 * @param {any} payload - Optional payload.
 * @param {Record<string, Function>} onEnterMap - Handler map.
 */
async function runOnEnter(stateName, machine, payload, onEnterMap) {
  const fn = onEnterMap[stateName];

  if (typeof fn === "function") {
    debugLog(`stateManager: Executing onEnter handler for '${stateName}'`, {
      stateName,
      hasPayload: !!payload
    });
    try {
      await fn(machine, payload);
      debugLog(`stateManager: onEnter handler completed for '${stateName}'`);
    } catch (err) {
      const errorMsg = `State onEnter error in '${stateName}': ${err.message || err}`;
      if (!IS_VITEST) {
        logError(errorMsg, err);
      } else if (!shouldSuppressDebugOutput()) {
        logDebug(errorMsg, err);
      }
      // Don't re-throw to prevent state machine deadlock
    }
  } else if (fn !== undefined) {
    logWarn(
      `Invalid onEnter handler for state '${stateName}': expected function, got ${typeof fn}`
    );
  } else {
    debugLog(`stateManager: No onEnter handler defined for state '${stateName}'`);
  }
}

/**
 * Validate onEnter handler map and log summary.
 *
 * @param {Record<string, Function>} onEnterMap - Handler map.
 * @param {Set} definedStates - Set of defined state names.
 */
function validateHandlerMap(onEnterMap, definedStates) {
  const statesWithHandlers = Array.from(definedStates).filter(
    (state) => typeof onEnterMap[state] === "function"
  );
  const statesWithoutHandlers = Array.from(definedStates).filter((state) => !(state in onEnterMap));

  if (statesWithoutHandlers.length > 0) {
    logWarn(
      `createStateManager: The following states do not have onEnter handlers: ${statesWithoutHandlers.join(", ")}`
    );
  }

  debugLog("createStateManager: onEnterMap validation", {
    totalStates: definedStates.size,
    statesWithHandlers: statesWithHandlers.length,
    statesWithoutHandlers: statesWithoutHandlers.length,
    missingStates: statesWithoutHandlers
  });
}

// ============================================================================
// State Manager Factory
// ============================================================================

/**
 * Typedef for state manager.
 *
 * @typedef {object} ClassicBattleStateManager
 * @property {object} context - Machine context.
 * @property {() => string} getState - Get current state name.
 * @property {(eventName: string, payload?: any) => Promise<boolean>} dispatch - Dispatch event.
 */

/**
 * Create a lightweight state manager for the Classic Battle finite-state machine.
 *
 * This factory constructs a minimal machine with `getState()` and
 * `dispatch(eventName, payload)` that consults a `stateTable` and invokes
 * `onEnter` handlers when entering states. It is intentionally small to keep
 * test harnesses fast and to allow the orchestrator to attach higher-level
 * behavior.
 *
 * @pseudocode
 * 1. Validate state table and context.
 * 2. Initialize state lookup map and determine initial state.
 * 3. Build trigger lookup for O(1) event resolution.
 * 4. Validate handler map coverage.
 * 5. Create machine with context, getState(), and async dispatch().
 * 6. In dispatch(): resolve target state, validate transition, run onEnter.
 * 7. Initialize machine state and run initial onEnter handler.
 *
 * @param {Record<string, Function>} [onEnterMap={}] - Map of state name -> onEnter handler.
 * @param {object} [context={}] - Initial machine context object.
 * @param {(args:{from:string|null,to:string,event:string|null})=>Promise<void>|void} [onTransition] - Optional transition hook.
 * @param {Array} [stateTable=CLASSIC_BATTLE_STATES] - Array of state definitions used by the machine.
 * @returns {Promise<ClassicBattleStateManager>} Resolves with the constructed machine.
 */
export async function createStateManager(
  onEnterMap = {},
  context = {},
  onTransition,
  stateTable = CLASSIC_BATTLE_STATES
) {
  // Validate inputs
  if (!validateStateTable(stateTable)) {
    throw new Error("Invalid state table provided to createStateManager");
  }
  if (!validateContext(context)) {
    throw new Error("Invalid context provided to createStateManager");
  }

  // Initialize state table
  const { byName: statesByName, initialState } = initializeStateTable(stateTable);
  const definedStates = new Set(statesByName.keys());
  let current = initialState;

  // Build trigger map for O(1) lookup
  const triggerMap = buildTriggerMap(statesByName);

  // Validate handler coverage
  validateHandlerMap(onEnterMap, definedStates);

  debugLog("createStateManager: initialized", {
    initialState,
    totalStates: definedStates.size,
    hasOnTransition: typeof onTransition === "function"
  });

  const machine = {
    context,
    getState: () => current,
    async dispatch(eventName, payload) {
      const from = current;
      const currentStateDef = statesByName.get(from);
      const availableTriggers = getAvailableTriggers(currentStateDef);

      let target = null;

      // First, check if there are any triggers with guards that need evaluation
      const triggersForEvent = (currentStateDef?.triggers || []).filter((t) => t.on === eventName);

      if (triggersForEvent.length > 0) {
        // Evaluate guards to find the first matching trigger
        for (const trigger of triggersForEvent) {
          const guardPassed = evaluateGuard(trigger.guard, context);
          if (guardPassed) {
            target = trigger.target;
            break;
          }
        }
      }

      // If no guarded trigger matched, try the fast-path trigger map
      if (!target) {
        const triggerKey = `${from}:${eventName}`;
        target = triggerMap.get(triggerKey);
      }

      // Fallback: check if event name is a direct state name
      if (!target && statesByName.has(eventName)) {
        target = eventName;
      }

      // Validate target resolution
      if (!target || !statesByName.has(target)) {
        logError("stateManager: dispatch failed", {
          event: eventName,
          currentState: from,
          availableTriggers,
          targetResolved: target,
          targetExists: target ? statesByName.has(target) : false,
          triggersWithGuards: triggersForEvent.length
        });
        return false;
      }

      // Update state
      current = target;

      // Validate transition
      if (!validateStateTransition(from, target, eventName, statesByName)) {
        logError(`State transition validation failed: ${from} -> ${target} via ${eventName}`);
        return false;
      }

      debugLog("stateManager: transition", { from, to: target, event: eventName });

      // Call transition hook
      try {
        await onTransition?.({ from, to: target, event: eventName });
      } catch (err) {
        logError("stateManager: onTransition error:", err);
        // Don't re-throw; transition already committed
      }

      // Run onEnter handler
      await runOnEnter(target, machine, payload, onEnterMap);

      return true;
    }
  };

  // Initialize machine
  try {
    await onTransition?.({ from: null, to: initialState, event: "init" });
  } catch (err) {
    logError("stateManager: onTransition error during init:", err);
  }
  await runOnEnter(initialState, machine, undefined, onEnterMap);

  return machine;
}

export {};
