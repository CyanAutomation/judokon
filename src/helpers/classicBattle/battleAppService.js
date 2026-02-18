import * as engineFacade from "../BattleEngine.js";
import { STATS } from "../BattleEngine.js";
import { logEvent } from "../telemetry.js";

function getFacadeMethod(name) {
  try {
    const method = engineFacade?.[name];
    return typeof method === "function" ? method : null;
  } catch {
    return null;
  }
}

const INTENT_HANDLERS = Object.freeze({
  "engine.create": (payload = {}) => getFacadeMethod("createBattleEngine")?.(payload),
  "engine.bootstrap.failure": (payload = {}) =>
    logEvent("classic_battle_bootstrap_failure", payload),
  "engine.reset": (payload = {}) => getFacadeMethod("resetBattleEnginePreservingConfig")?.(payload),
  "engine.get": () => getFacadeMethod("getEngine")?.(),
  "engine.setPointsToWin": (payload = {}) => getFacadeMethod("setPointsToWin")?.(payload.value),
  "battle.startRound": (payload = {}) => getFacadeMethod("startRound")?.(...(payload.args ?? [])),
  "battle.startCoolDown": (payload = {}) =>
    getFacadeMethod("startCoolDown")?.(...(payload.args ?? [])),
  "battle.stopTimer": () => getFacadeMethod("stopTimer")?.(),
  "battle.pauseTimer": () => getFacadeMethod("pauseTimer")?.(),
  "battle.resumeTimer": () => getFacadeMethod("resumeTimer")?.(),
  "battle.handleStatSelection": (payload = {}) =>
    getFacadeMethod("handleStatSelection")?.(...(payload.args ?? [])),
  "battle.quitMatch": () => getFacadeMethod("quitMatch")?.(),
  "battle.interruptMatch": (payload = {}) => getFacadeMethod("interruptMatch")?.(payload.reason)
});

/**
 * Route app-level battle intents to the engine facade.
 *
 * @param {string} intent - Intent key that maps to a facade action.
 * @param {Record<string, unknown>} [payload={}] - Optional payload forwarded to the mapped action.
 * @returns {unknown} Handler return value from the facade.
 * @pseudocode
 * lookup handler from frozen intent map
 * if handler is missing, throw unsupported-intent error
 * invoke handler with payload and return facade result
 */
export function dispatchIntent(intent, payload = {}) {
  const handler = INTENT_HANDLERS[intent];
  if (typeof handler !== "function") {
    throw new Error(`Unsupported battle app intent: ${intent}`);
  }
  return handler(payload);
}

/**
 * Subscribe to engine events through the facade and return safe cleanup.
 *
 * @param {string} eventName - Event name to subscribe to.
 * @param {(payload?: unknown) => void} handler - Listener callback.
 * @returns {() => void} Cleanup callback that unregisters only successful subscriptions.
 * @pseudocode
 * validate event name and handler types
 * resolve the facade on() method; return noop when unavailable
 * call on() in try/catch and return noop when registration fails
 * return cleanup callback that safely delegates to off()
 */
export function subscribe(eventName, handler) {
  if (typeof eventName !== "string" || typeof handler !== "function") {
    return () => {};
  }
  const onMethod = getFacadeMethod("on");
  if (!onMethod) {
    return () => {};
  }
  try {
    onMethod(eventName, handler);
  } catch {
    return () => {};
  }
  return () => {
    const offMethod = getFacadeMethod("off");
    if (!offMethod) {
      return;
    }
    try {
      offMethod(eventName, handler);
    } catch {}
  };
}

/**
 * Read immutable battle state snapshots from the facade.
 *
 * @returns {{pointsToWin: unknown, scores: Readonly<Record<string, number>>, roundsPlayed: number, matchEnded: boolean, timerState: Readonly<Record<string, unknown>>, currentStats: Readonly<Record<string, unknown>>}} Immutable state snapshot.
 * @pseudocode
 * read points, score, rounds, match state, timer, and current stats from facade
 * apply safe defaults when methods are missing
 * clone nested objects and freeze them
 * return frozen aggregate snapshot object
 */
export function getSnapshot() {
  const pointsToWin = getFacadeMethod("getPointsToWin")?.();
  const scores = getFacadeMethod("getScores")?.() ?? { playerScore: 0, opponentScore: 0 };
  const roundsPlayed = getFacadeMethod("getRoundsPlayed")?.() ?? 0;
  const matchEnded = getFacadeMethod("isMatchEnded")?.() ?? false;
  const timerState = getFacadeMethod("getTimerState")?.() ?? {};
  const currentStats = getFacadeMethod("getCurrentStats")?.() ?? {};

  return Object.freeze({
    pointsToWin,
    scores: Object.freeze({ ...scores }),
    roundsPlayed,
    matchEnded,
    timerState: Object.freeze({ ...timerState }),
    currentStats: Object.freeze({ ...currentStats })
  });
}

/**
 * Re-exported battle stat identifiers for surface modules.
 *
 * @type {Readonly<Record<string, string>>}
 */
export { STATS };
