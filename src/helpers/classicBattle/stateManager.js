import { CLASSIC_BATTLE_STATES } from "./stateTable.js";
const IS_VITEST = typeof process !== "undefined" && !!process.env?.VITEST;

/**
 * @typedef {object} ClassicBattleStateManager
 * @property {object} context
 * @property {() => string} getState
 * @property {(eventName: string, payload?: any) => Promise<void>} dispatch
 */

/**
 * Slim state manager for Classic Battle.
 *
 * Core progression:
 * waitingForMatchStart → matchStart → cooldown → roundStart → waitingForPlayerAction →
 * roundDecision → roundOver → matchDecision → matchOver.
 * Interrupt paths:
 * matchStart/error/interrupt → interruptMatch
 * round phases interrupt → interruptRound → { restartRound: cooldown, resumeLobby: waitingForMatchStart, abortMatch: matchOver }
 * Optional admin branch: interruptRound --roundModifyFlag--> roundModification --modifyRoundDecision--> roundStart.
 *
 * States and triggers are defined in `stateTable.js`.
 *
 * @param {Record<string, Function>} onEnterMap
 * @param {object} context
 * @param {(args:{from:string|null,to:string,event:string|null})=>Promise<void>|void} [onTransition]
 * @param {Array} [stateTable=CLASSIC_BATTLE_STATES]
 * @returns {Promise<ClassicBattleStateManager>}
 */
export async function createStateManager(
  onEnterMap = {},
  context = {},
  onTransition,
  stateTable = CLASSIC_BATTLE_STATES
) {
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
      const state = byName.get(current);
      const trigger = state?.triggers?.find((t) => t.on === eventName);
      let target = trigger?.target;
      if (!target && byName.has(eventName)) target = eventName;
      if (!target || !byName.has(target)) return;
      const from = current;
      current = target;
      try {
        await onTransition?.({ from, to: target, event: eventName });
      } catch {}
      await runOnEnter(target, payload);
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
