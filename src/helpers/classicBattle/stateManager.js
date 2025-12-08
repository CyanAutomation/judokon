import { CLASSIC_BATTLE_STATES } from "./stateTable.js";
import { debugLog, shouldSuppressDebugOutput } from "./debugLog.js";
import { error as logError, warn as logWarn, debug as logDebug } from "../logger.js";

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
 * @param {Map} statesByName - State lookup map.
 * @returns {Map} Map of "stateName:eventName" -> target state.
 */
function buildTriggerMap(statesByName) {
  const triggerMap = new Map();

  for (const [stateName, stateDef] of statesByName) {
    for (const trigger of stateDef.triggers || []) {
      const key = `${stateName}:${trigger.on}`;
      triggerMap.set(key, trigger.target);
    }
  }

  return triggerMap;
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

  if (stateTable.length === 0) {
    logError("State table is empty");
    return false;
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
  console.log("[runOnEnter] Running onEnter for state:", stateName, "has handler:", typeof fn);

  if (typeof fn === "function") {
    debugLog(`stateManager: Executing onEnter handler for '${stateName}'`, {
      stateName,
      hasPayload: !!payload
    });
    try {
      console.log("[runOnEnter] Executing handler for:", stateName);
      await fn(machine, payload);
      console.log("[runOnEnter] Handler completed for:", stateName);
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

      // Resolve target state: try trigger map first, then state name fallback
      const triggerKey = `${from}:${eventName}`;
      let target = triggerMap.get(triggerKey);

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
          targetExists: target ? statesByName.has(target) : false
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
