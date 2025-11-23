import { CLASSIC_BATTLE_STATES } from "./stateTable.js";
import { debugLog, shouldSuppressDebugOutput } from "./debugLog.js";
import { error as logError, warn as logWarn, debug as logDebug } from "../logger.js";

const IS_VITEST = typeof process !== "undefined" && !!process.env?.VITEST;

// Constants
const DEFAULT_INITIAL_STATE = "waitingForMatchStart";
const VALIDATION_WARN_ENABLED = true;

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
 * @returns {Map} Map of "eventName:stateName" -> target state.
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
 * Create a lightweight state manager for the Classic Battle finite-state machine.
 *
 * This factory constructs a minimal machine with `getState()` and
 * `dispatch(eventName, payload)` that consults a `stateTable` and invokes
 * `onEnter` handlers when entering states. It is intentionally small to keep
 * test harnesses fast and to allow the orchestrator to attach higher-level
 * behavior.
 *
 * @pseudocode
 * 1. Build a `byName` map from `stateTable` and determine the initial state.
 * 2. Create `machine` with `context`, `getState()` and async `dispatch()`.
 * 3. In `dispatch()`: locate a trigger for `eventName` and derive the target
 *    state; if none found, and `eventName` matches a state name, use that.
 * 4. Update `current` to the target and call `onTransition` with `{from,to,event}`.
 * 5. Run `runOnEnter(target, payload)` which calls the corresponding handler
 *    from `onEnterMap` if present and swallows errors in test mode.
 * 6. Initialize the machine by invoking `onTransition({from:null,to:init,event:'init'})`
 *    and run the initial state's `onEnter` handler.
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
  debugLog("createStateManager: stateTable", stateTable);
  const byName = new Map();
  let initial = null;
  for (const s of Array.isArray(stateTable) ? stateTable : []) {
    byName.set(s.name, s);
    if (s.type === "initial" || initial === null) {
      initial = s.name;
    }
  }
  const initName = initial || "waitingForMatchStart";
  let current = initName;

  // Validate onEnterMap integrity: warn if states are missing handlers
  const definedStates = Array.from(byName.keys());
  const statesWithHandlers = definedStates.filter(
    (state) => typeof onEnterMap[state] === "function"
  );
  const statesWithoutHandlers = definedStates.filter((state) => !(state in onEnterMap));
  if (statesWithoutHandlers.length > 0) {
    logWarn(
      `createStateManager: The following states do not have onEnter handlers: ${statesWithoutHandlers.join(", ")}`
    );
  }
  debugLog("createStateManager: onEnterMap validation", {
    totalStates: definedStates.length,
    statesWithHandlers: statesWithHandlers.length,
    statesWithoutHandlers: statesWithoutHandlers.length,
    missingStates: statesWithoutHandlers
  });

  const machine = {
    context,
    getState: () => current,
    async dispatch(eventName, payload) {
      debugLog("stateManager: dispatch called", {
        event: eventName,
        payload,
        current
      });
      try {
        const state = byName.get(current);
        debugLog("stateManager: current state definition", {
          state: current,
          stateFound: !!state,
          triggers: state?.triggers?.map((t) => t.on) ?? []
        });
        const trigger = state?.triggers?.find((t) => t.on === eventName);
        debugLog("stateManager: trigger search", {
          eventName,
          triggerFound: !!trigger,
          targetFromTrigger: trigger?.target
        });
        let target = trigger?.target;
        if (!target && byName.has(eventName)) target = eventName;
        debugLog("stateManager: target resolution", {
          targetFromTrigger: trigger?.target,
          targetIsStateName: !trigger && byName.has(eventName),
          finalTarget: target,
          targetExists: byName.has(target)
        });
        if (!target || !byName.has(target)) {
          logError(
            "stateManager: dispatch returning false. target:",
            target,
            "byName.has(target):",
            byName.has(target),
            "current state:",
            current,
            "available triggers:",
            state?.triggers?.map((t) => t.on) ?? []
          );
          return false;
        }
        const from = current;
        debugLog("stateManager: before current update", { target, current });
        current = target;
        debugLog("stateManager: after current update", { current });
        // Validate the state transition
        if (!validateStateTransition(from, target, eventName, stateTable)) {
          logError(`State transition validation failed: ${from} -> ${target} via ${eventName}`);
          return false;
        }
        // [TEST DEBUG] log state transition attempt
        debugLog("stateManager transition", { from, to: target, event: eventName });
        try {
          await onTransition?.({ from, to: target, event: eventName });
        } catch {}
        await runOnEnter(target, payload);
        return true;
      } catch (error) {
        logError("stateManager: Error in dispatch:", error);
        throw error; // Re-throw to see the error in orchestrator
      }
    }
  };

  async function runOnEnter(stateName, payload) {
    const fn = onEnterMap[stateName];
    if (typeof fn === "function") {
      debugLog(`stateManager: Executing onEnter handler for '${stateName}'`, {
        stateName,
        hasPayload: !!payload
      });
      try {
        await fn(machine, payload);
        debugLog(`stateManager: onEnter handler completed for '${stateName}'`, {
          stateName
        });
      } catch (err) {
        const errorMsg = `State onEnter error in '${stateName}': ${err.message || err}`;
        if (!IS_VITEST) {
          logError(errorMsg, err);
        } else if (!shouldSuppressDebugOutput()) {
          logDebug(errorMsg, err);
        }
        // Don't re-throw errors in onEnter handlers to prevent state machine deadlock
        // Log the error and continue with the transition
      }
    } else if (fn !== undefined) {
      logWarn(
        `Invalid onEnter handler for state '${stateName}': expected function, got ${typeof fn}`
      );
    } else {
      debugLog(`stateManager: No onEnter handler defined for state '${stateName}'`, {
        stateName
      });
    }
  }

  try {
    await onTransition?.({ from: null, to: initName, event: "init" });
  } catch {}
  await runOnEnter(initName);
  return machine;
}

export {};
