import {
  createBattleEngine,
  setPointsToWin,
  getScores,
  getRoundsPlayed,
  getSeed,
  getTimerState
} from "./battleEngineFacade.js";
import { createBattleStore } from "./classicBattle/roundManager.js";
import {
  initClassicBattleOrchestrator,
  dispatchBattleEvent,
  getBattleStateMachine
} from "./classicBattle/orchestrator.js";
import { emitBattleEvent } from "./classicBattle/battleEvents.js";

let store = null;
let initialized = false;
let injectedTimers = null;

async function ensureOrchestrator(config = {}) {
  if (!initialized) {
    // Create engine first so seed/pointsToWin apply to the match
    try {
      createBattleEngine(config);
      if (typeof config?.pointsToWin === "number") setPointsToWin(Number(config.pointsToWin));
    } catch {}
    store = createBattleStore();
    await initClassicBattleOrchestrator(store);
    initialized = true;
  }
}

/**
 * Start a match via the classic battle orchestrator.
 *
 * @pseudocode
 * 1. Ensure orchestrator initialized (create engine with config, create store, init orchestrator).
 * 2. Dispatch `startClicked` to enter matchStart, then return.
 *
 * @param {{pointsToWin?:number, maxRounds?:number, autoSelect?:any, seed?:number}} [config]
 * @returns {Promise<void>}
 */
export async function startMatch(config = {}) {
  await ensureOrchestrator(config);
  await dispatchBattleEvent("startClicked");
}

/**
 * Confirm readiness for the next phase (lobby→cooldown or cooldown→roundStart).
 *
 * @pseudocode
 * 1. Emit PRD control.readiness.confirmed, then dispatch `ready`.
 *
 * @returns {Promise<void>}
 */
export async function confirmReadiness() {
  try {
    emitBattleEvent("control.readiness.confirmed", { for: "next" });
  } catch {}
  await dispatchBattleEvent("ready");
}

/**
 * Request an interrupt at round or match scope.
 *
 * @pseudocode
 * 1. Emit PRD interrupt.requested with scope and reason.
 * 2. Dispatch `interrupt` on the state machine.
 *
 * @param {"round"|"match"} scope
 * @param {string} [reason]
 * @returns {Promise<void>}
 */
export async function requestInterrupt(scope = "round", reason = "") {
  try {
    emitBattleEvent("interrupt.requested", { scope, reason });
  } catch {}
  await dispatchBattleEvent("interrupt", { scope, reason });
}

/**
 * Return orchestrator node and minimal engine context.
 *
 * @pseudocode
 * 1. Read machine.getState() as node.
 * 2. Build context: roundIndex, scores, seed, timerState.
 *
 * @returns {{ node: string|null, context: { roundIndex: number, scores: {player:number, opponent:number}, seed: number|undefined, timerState: object } }}
 */
export function getState() {
  let node = null;
  try {
    const m = getBattleStateMachine?.();
    node = m?.getState?.() || null;
  } catch {}
  const scores = (() => {
    try {
      const s = getScores?.();
      return { player: Number(s?.playerScore) || 0, opponent: Number(s?.opponentScore) || 0 };
    } catch {
      return { player: 0, opponent: 0 };
    }
  })();
  const roundIndex = (() => {
    try {
      const r = getRoundsPlayed?.();
      return Number(r) || 0;
    } catch {
      return 0;
    }
  })();
  const seed = (() => {
    try {
      return getSeed?.();
    } catch {
      return undefined;
    }
  })();
  const timerState = (() => {
    try {
      return getTimerState?.() || {};
    } catch {
      return {};
    }
  })();
  return { node, context: { roundIndex, scores, seed, timerState } };
}

/**
 * Register fake timers API for tests. Stored for future integration.
 *
 * @pseudocode
 * 1. Store provided API in module scope and return a disposer to clear it.
 *
 * @param {any} fakeTimersApi
 * @returns {() => void}
 */
export function injectFakeTimers(fakeTimersApi) {
  injectedTimers = fakeTimersApi || null;
  return () => {
    injectedTimers = null;
  };
}

export default {
  startMatch,
  confirmReadiness,
  requestInterrupt,
  getState,
  injectFakeTimers
};
