import { CLASSIC_BATTLE_STATES } from "./stateTable.js";
const IS_VITEST = typeof process !== "undefined" && !!process.env?.VITEST;

/**
 * Validates a state transition agai        console.warn(
          `Invalid onEnter handler for state '${stateName}': expected function, got ${typeof fn}`
        );st the state table.
 *
 * @param {string} fromState - The current state name.
 * @param {string} toState - The target state name.
 * @param {string} eventName - The event that triggered the transition.
 * @param {Array} stateTable - The state table to validate against.
 * @returns {boolean} True if the transition is valid, false otherwise.
 */
function validateStateTransition(fromState, toState, eventName, stateTable) {
  const fromStateDef = stateTable.find((s) => s.name === fromState);
  if (!fromStateDef) {
    console.error(`State validation error: Unknown fromState '${fromState}'`);
    return false;
  }

  const toStateDef = stateTable.find((s) => s.name === toState);
  if (!toStateDef) {
    console.error(`State validation error: Unknown toState '${toState}'`);
    return false;
  }

  // Check if the event is allowed from the current state
  const validTrigger = fromStateDef.triggers?.find(
    (t) => t.on === eventName && t.target === toState
  );
  if (!validTrigger) {
    console.warn(
      `State validation warning: Event '${eventName}' may not be valid from '${fromState}' to '${toState}'`
    );
    // Don't fail validation for unknown events, just warn
  }

  return true;
}

/**
 * @typedef {object} ClassicBattleStateManager
 * @property {object} context
 * @property {() => string} getState
 * @property {(eventName: string, payload?: any) => Promise<void>} dispatch
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
  if (typeof console !== "undefined") {
    console.error("[TEST DEBUG] createStateManager: stateTable", stateTable);
  }
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

  const machine = {
    context,
    getState: () => current,
    async dispatch(eventName, payload) {
      if (typeof console !== "undefined") {
        console.error(
          "[TEST DEBUG] stateManager: dispatch called with",
          "event=",
          eventName,
          "payload=",
          payload,
          "current=",
          current
        );
      }
      try {
        const state = byName.get(current);
        const trigger = state?.triggers?.find((t) => t.on === eventName);
        let target = trigger?.target;
        if (!target && byName.has(eventName)) target = eventName;
        if (!target || !byName.has(target)) {
          console.error(
            "stateManager: dispatch returning false. target:",
            target,
            "byName.has(target):",
            byName.has(target)
          );
          return false;
        }
        const from = current;
        console.error(
          "[TEST DEBUG] stateManager: Before current update, target:",
          target,
          "current:",
          current
        );
        current = target;
        console.error("[TEST DEBUG] stateManager: After current update, current:", current);
        // Validate the state transition
        if (!validateStateTransition(from, target, eventName, stateTable)) {
          console.error(
            `State transition validation failed: ${from} -> ${target} via ${eventName}`
          );
          return false;
        }
        // [TEST DEBUG] log state transition attempt
        if (typeof console !== "undefined") {
          console.error("[TEST DEBUG] stateManager transition:", {
            from,
            to: target,
            event: eventName
          });
        }
        try {
          await onTransition?.({ from, to: target, event: eventName });
        } catch {}
        await runOnEnter(target, payload);
        return true;
      } catch (error) {
        console.error("stateManager: Error in dispatch:", error);
        throw error; // Re-throw to see the error in orchestrator
      }
    }
  };

  async function runOnEnter(stateName, payload) {
    const fn = onEnterMap[stateName];
    if (typeof fn === "function") {
      try {
        await fn(machine, payload);
      } catch (err) {
        const errorMsg = `State onEnter error in '${stateName}': ${err.message || err}`;
        if (!IS_VITEST) {
          console.error(errorMsg, err);
        } else {
          console.debug(errorMsg, err);
        }
        // Don't re-throw errors in onEnter handlers to prevent state machine deadlock
        // Log the error and continue with the transition
      }
    } else if (fn !== undefined) {
      console.warn(
        `Invalid onEnter handler for state '${stateName}': expected function, got ${typeof fn}`
      );
    }
  }

  try {
    await onTransition?.({ from: null, to: initName, event: "init" });
  } catch {}
  await runOnEnter(initName);
  return machine;
}

export {};
