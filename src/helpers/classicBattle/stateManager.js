import { CLASSIC_BATTLE_STATES, GUARD_CONDITIONS } from "./stateTable.js";
import { debugLog, shouldSuppressDebugOutput } from "./debugLog.js";
import { error as logError, warn as logWarn, debug as logDebug } from "../logger.js";
import { isEnabled } from "../featureFlags.js";

// Constants
const DEFAULT_INITIAL_STATE = "waitingForMatchStart";
const VALIDATION_WARN_ENABLED = true;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Resolve a feature-flag-based guard with overrides.
 *
 * @param {object} args - Guard resolver parameters.
 * @param {string} args.guardName - Guard name for overrides (e.g., "autoSelectEnabled").
 * @param {string} args.featureFlagKey - Feature flag key (e.g., "autoSelect").
 * @param {object} args.context - Machine context for flag overrides.
 * @param {Record<string, boolean>} args.guardOverrides - Explicit overrides.
 * @returns {boolean} True if guard passes.
 */
function resolveGuardToggle({ guardName, featureFlagKey, context, guardOverrides }) {
  if (guardOverrides && Object.prototype.hasOwnProperty.call(guardOverrides, guardName)) {
    return !!guardOverrides[guardName];
  }

  if (context?.flags && featureFlagKey in context.flags) {
    return !!context.flags[featureFlagKey];
  }

  return isEnabled(featureFlagKey) === true;
}

function isAutoSelectEnabled(context, guardOverrides) {
  return resolveGuardToggle({
    guardName: GUARD_CONDITIONS.AUTO_SELECT_ENABLED,
    featureFlagKey: "autoSelect",
    context,
    guardOverrides
  });
}

function isRoundModifyEnabled(context, guardOverrides) {
  return resolveGuardToggle({
    guardName: GUARD_CONDITIONS.FF_ROUND_MODIFY,
    featureFlagKey: "roundModify",
    context,
    guardOverrides
  });
}

function isWinConditionMet(context) {
  if (!context?.engine) {
    logWarn("isWinConditionMet: context.engine is missing");
    return false;
  }

  const scores = context.engine.getScores?.();
  const pointsToWin = context.engine.pointsToWin;

  if (!scores || typeof pointsToWin !== "number") {
    logWarn("isWinConditionMet: scores or pointsToWin is missing", { scores, pointsToWin });
    return false;
  }

  const { playerScore, opponentScore } = scores;
  if (typeof playerScore !== "number" || typeof opponentScore !== "number") {
    logWarn("isWinConditionMet: invalid score values", { playerScore, opponentScore });
    return false;
  }
  return playerScore >= pointsToWin || opponentScore >= pointsToWin;
}

/**
 * Evaluate a guard condition string against the current context.
 *
 * @param {string} guardCondition - Guard condition name or expression
 * @param {object} context - Machine context
 * @param {Record<string, boolean>} guardOverrides - Explicit guard overrides
 * @returns {boolean} True if guard passes, false otherwise
 */
function evaluateGuard(guardCondition, context, guardOverrides) {
  if (!guardCondition) return true;

  switch (guardCondition) {
    case GUARD_CONDITIONS.AUTO_SELECT_ENABLED:
      return isAutoSelectEnabled(context, guardOverrides);
    case GUARD_CONDITIONS.AUTO_SELECT_DISABLED:
      return !isAutoSelectEnabled(context, guardOverrides);
    case GUARD_CONDITIONS.FF_ROUND_MODIFY:
      return isRoundModifyEnabled(context, guardOverrides);
    case GUARD_CONDITIONS.WIN_CONDITION_MET:
      return isWinConditionMet(context);
    default:
      logWarn(`Unknown guard condition: ${guardCondition}`);
      return false;
  }
}

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
      // console.error("[stateManager] Invalid transition", { from, to, event });
      if (!shouldSuppressDebugOutput()) {
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

/**
 * Resolve the target state for a given event in a specific state.
 *
 * @pseudocode
 * 1. Select the per-state resolver based on the current state.
 * 2. Execute explicit event/guard checks for that state.
 * 3. Return the target state name or null if no valid transition exists.
 *
 * @param {string} currentState - Current state name.
 * @param {string} eventName - Event/trigger name.
 * @param {object} context - Machine context for guard evaluation.
 * @returns {string|null} Target state name or null if no valid transition.
 */
function resolveWaitingForMatchStartTransition(eventName) {
  if (eventName === "startClicked") return "matchStart";
  if (eventName === "interrupt") return "waitingForMatchStart";
  return null;
}

function resolveMatchStartTransition(eventName) {
  if (eventName === "ready") return "roundWait";
  if (eventName === "interrupt" || eventName === "error") return "interruptMatch";
  return null;
}

function resolveRoundWaitTransition(eventName) {
  if (eventName === "ready") return "roundPrompt";
  if (eventName === "interrupt") return "interruptRound";
  return null;
}

function resolveRoundPromptTransition(eventName) {
  if (eventName === "cardsRevealed") return "roundSelect";
  if (eventName === "interrupt") return "interruptRound";
  return null;
}

function resolveRoundSelectTransition(eventName, context, guardOverrides) {
  if (eventName === "statSelected") return "roundResolve";
  if (eventName === "timeout") {
    return isAutoSelectEnabled(context, guardOverrides) ? "roundResolve" : "interruptRound";
  }
  if (eventName === "interrupt") return "interruptRound";
  return null;
}

function resolveRoundResolveTransition(eventName) {
  if (eventName === "outcome=winPlayer") return "roundDisplay";
  if (eventName === "outcome=winOpponent") return "roundDisplay";
  if (eventName === "outcome=draw") return "roundDisplay";
  if (eventName === "evaluate") return "roundResolve";
  return null;
}

function resolveRoundDisplayTransition(eventName, context) {
  if (eventName === "matchPointReached") {
    return isWinConditionMet(context) ? "matchDecision" : null;
  }
  if (eventName === "continue") return "roundWait";
  return null;
}

function resolveMatchDecisionTransition(eventName) {
  if (eventName === "finalize") return "matchOver";
  return null;
}

function resolveMatchOverTransition(eventName) {
  if (eventName === "rematch") return "waitingForMatchStart";
  if (eventName === "home") return "waitingForMatchStart";
  return null;
}

function resolveInterruptRoundTransition(eventName) {
  if (eventName === "restartRound") return "roundWait";
  if (eventName === "resumeLobby") return "waitingForMatchStart";
  if (eventName === "abortMatch") return "matchOver";
  return null;
}

function resolveInterruptMatchTransition(eventName) {
  if (eventName === "restartMatch") return "matchStart";
  if (eventName === "toLobby") return "waitingForMatchStart";
  return null;
}

function resolveClassicBattleTransition(currentState, eventName, context, guardOverrides, payload) {
  switch (currentState) {
    case "waitingForMatchStart":
      return resolveWaitingForMatchStartTransition(eventName);
    case "matchStart":
      return resolveMatchStartTransition(eventName);
    case "roundWait":
      return resolveRoundWaitTransition(eventName);
    case "roundPrompt":
      return resolveRoundPromptTransition(eventName);
    case "roundSelect":
      return resolveRoundSelectTransition(eventName, context, guardOverrides);
    case "roundResolve":
      return resolveRoundResolveTransition(eventName);
    case "roundDisplay":
      return resolveRoundDisplayTransition(eventName, context);
    case "matchDecision":
      return resolveMatchDecisionTransition(eventName);
    case "matchOver":
      return resolveMatchOverTransition(eventName);
    case "interruptRound":
      return resolveInterruptRoundTransition(eventName);
    case "interruptMatch":
      return resolveInterruptMatchTransition(eventName);
    default:
      return null;
  }
}

/**
 * Execute a validated state transition with side effects.
 * Handles state update, transition hook, and onEnter handler.
 *
 * @pseudocode
 * 1. Validate state transition against allowed triggers.
 * 2. Update current state reference (must be mutable closure var).
 * 3. Invoke onTransition hook (if defined) and log errors.
 * 4. Execute onEnter handler for target state.
 * 5. Return true on success, log and return false on critical failure.
 *
 * @param {string} fromState - Source state name.
 * @param {string} toState - Target state name.
 * @param {string} eventName - Event that triggered the transition.
 * @param {Map} statesByName - State lookup map.
 * @param {object} machine - Machine reference (for onEnter context).
 * @param {any} payload - Optional payload to pass to onEnter.
 * @param {Function} onTransition - Optional transition hook.
 * @param {Record<string, Function>} onEnterMap - onEnter handler map.
 * @param {Function} updateCurrentState - Callback to update current state closure var.
 * @returns {Promise<boolean>} True if transition completed, false if critical error.
 */
async function executeTransition(
  fromState,
  toState,
  eventName,
  statesByName,
  machine,
  payload,
  onTransition,
  onEnterMap,
  updateCurrentState
) {
  // Validate transition
  if (!validateStateTransition(fromState, toState, eventName, statesByName)) {
    logError(`State transition validation failed: ${fromState} -> ${toState} via ${eventName}`);
    return false;
  }

  debugLog("stateManager: transition", { from: fromState, to: toState, event: eventName });

  // Update state
  updateCurrentState(toState);

  // Call transition hook
  try {
    await onTransition?.({ from: fromState, to: toState, event: eventName });
  } catch (err) {
    logError("stateManager: onTransition error:", err);
    // Don't re-throw; transition already committed
  }

  // Run onEnter handler
  await runOnEnter(toState, machine, payload, onEnterMap);

  return true;
}

/**
 * Get available transitions (triggers) for a given state.
 * Useful for debugging, UI hints, or testing.
 *
 * @pseudocode
 * 1. Look up state definition by name.
 * 2. If state not found, return empty array.
 * 3. Map triggers array to simple objects with event, target, and optional guard.
 * 4. Return array of available transitions for the state.
 *
 * @param {string} stateName - State name to query.
 * @param {Map} statesByName - State lookup map.
 * @returns {Array<{event: string, target: string, guard?: string}>} Array of available triggers.
 */
export function getAvailableTransitions(stateName, statesByName) {
  const stateDef = statesByName?.get(stateName);
  if (!stateDef) {
    return [];
  }
  return (stateDef.triggers || []).map((t) => ({
    event: t.on,
    target: t.target,
    ...(t.guard && { guard: t.guard })
  }));
}

/**
 * Debug utility: Print the state machine table in human-readable format.
 * Useful for understanding FSM structure and verifying state definitions.
 *
 * @pseudocode
 * 1. For each state, print name and type.
 * 2. For each trigger, print event, target, and guard (if present).
 * 3. Format with indentation and separators for readability.
 *
 * @param {Map} statesByName - State lookup map.
 * @param {object} [options] - Display options.
 * @param {boolean} [options.includeGuards=true] - Include guard conditions in output.
 * @param {boolean} [options.useConsole=false] - Use console.log instead of debugLog.
 * @returns {string} Formatted state table string.
 */
export function debugStateTable(statesByName, options = {}) {
  const { includeGuards = true, useConsole = false } = options;
  const logFn = useConsole ? console.log : debugLog;

  let output = "\n=== State Machine Debug Table ===\n";

  for (const [stateName, stateDef] of statesByName) {
    output += `STATE: ${stateName}${stateDef.type === "initial" ? " [INITIAL]" : ""}\n`;
    const triggers = stateDef.triggers || [];

    if (triggers.length === 0) {
      output += "  (no transitions)\n";
    } else {
      for (const trigger of triggers) {
        const guardStr = includeGuards && trigger.guard ? ` [guard: ${trigger.guard}]` : "";
        output += `  --[${trigger.on}]-->  ${trigger.target}${guardStr}\n`;
      }
    }
    output += "\n";
  }

  logFn(output);
  return output;
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
 * @property {() => Array<{event: string, target: string, guard?: string}>} getAvailableTransitions - Get available transitions from current state.
 * @property {(eventName: string, payload?: any) => Promise<boolean>} dispatch - Dispatch event and transition state.
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
 * 3. Validate handler map coverage.
 * 4. Create machine with context, getState(), dispatch(), and getAvailableTransitions().
 * 5. In dispatch(): resolve target state via explicit transition function, validate transition, run onEnter.
 * 6. Initialize machine state and run initial onEnter handler.
 *
 * @example
 * const machine = await createStateManager({
 *   waitingForMatchStart: (machine) => console.log('Match started'),
 *   statSelected: (machine, payload) => console.log('Stat:', payload)
 * }, { engine: battleEngine });
 *
 * console.log(machine.getState()); // 'waitingForMatchStart'
 * await machine.dispatch('startClicked');
 * console.log(machine.getState()); // Next state
 * console.log(machine.getAvailableTransitions()); // Available events from current state
 *
 * @example
 * // Debug FSM structure
 * import { debugStateTable } from './stateManager.js';
 * const { byName } = initializeStateTable(CLASSIC_BATTLE_STATES);
 * debugStateTable(byName, { useConsole: true });
 *
 * 1. Validate state table and context.
 * 2. Initialize state lookup map and determine initial state.
 * 3. Validate handler map coverage.
 * 4. Create machine with context, getState(), and async dispatch().
 * 5. In dispatch(): resolve target state, validate transition, run onEnter.
 * 6. Initialize machine state and run initial onEnter handler.
 *
 * @param {Record<string, Function>} [onEnterMap={}] - Map of state name -> onEnter handler.
 * @param {object} [context={}] - Initial machine context object.
 * @param {(args:{from:string|null,to:string,event:string|null})=>Promise<void>|void} [onTransition] - Optional transition hook.
 * @param {Array} [stateTable=CLASSIC_BATTLE_STATES] - Array of state definitions used by the machine.
 * @param {Record<string, boolean>} [guardOverrides] - Optional guard override map to force guard results for testing/admin flows. Overrides passed directly to this function take precedence over context.guardOverrides.
 * @returns {Promise<ClassicBattleStateManager>} Resolves with the constructed machine.
 */
export async function createStateManager(
  onEnterMap = {},
  context = {},
  onTransition,
  stateTable = CLASSIC_BATTLE_STATES,
  guardOverrides
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
  // Resolve guard overrides with precedence: parameter > context.guardOverrides
  const resolvedGuardOverrides = guardOverrides || context?.guardOverrides;

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
    getAvailableTransitions: () => getAvailableTransitions(current, statesByName),
    async dispatch(eventName, payload) {
      const from = current;
      const currentStateDef = statesByName.get(from);
      const availableTriggers = getAvailableTriggers(currentStateDef);

      // Prefer explicit trigger from the provided state table if available (allows test-provided overrides)
      let target = null;
      try {
        const triggers = (currentStateDef?.triggers || []).filter((t) => t.on === eventName);
        for (const trigger of triggers) {
          // Evaluate guard condition if present
          if (trigger.guard) {
            const guardPassed = evaluateGuard(trigger.guard, context, resolvedGuardOverrides);
            if (!guardPassed) {
              continue; // Try next trigger if this guard failed
            }
          }
          target = trigger.target;
          break; // Found matching trigger with passing guard
        }
      } catch {}

      // Fallback to legacy resolver when explicit trigger not provided
      if (!target) {
        target = resolveClassicBattleTransition(
          from,
          eventName,
          context,
          resolvedGuardOverrides,
          payload
        );
      }

      // Validate target resolution
      if (!target || !statesByName.has(target)) {
        const triggersForEvent = (currentStateDef?.triggers || []).filter(
          (t) => t.on === eventName
        );
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

      // Execute the validated transition
      return executeTransition(
        from,
        target,
        eventName,
        statesByName,
        machine,
        payload,
        onTransition,
        onEnterMap,
        (newState) => {
          current = newState;
        }
      );
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
