import { CLASSIC_BATTLE_STATES } from "./stateTable.js";
const IS_VITEST = typeof process !== "undefined" && !!process.env?.VITEST;

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
    console.log("[TEST DEBUG] createStateManager: stateTable", stateTable);
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
        console.log(
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
        current = target;
        // [TEST DEBUG] log state transition attempt
        if (typeof console !== "undefined") {
          console.log("[TEST DEBUG] stateManager transition:", {
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
        if (!IS_VITEST) console.debug("State onEnter error", stateName, err);
      }
    }
  }

  try {
    await onTransition?.({ from: null, to: initName, event: "init" });
  } catch {}
  await runOnEnter(initName);
  return machine;
}

export {};
