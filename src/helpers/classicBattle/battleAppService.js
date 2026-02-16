import * as engineFacade from "../BattleEngine.js";
import { STATS } from "../BattleEngine.js";

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

export function dispatchIntent(intent, payload = {}) {
  const handler = INTENT_HANDLERS[intent];
  if (typeof handler !== "function") {
    throw new Error(`Unsupported battle app intent: ${intent}`);
  }
  return handler(payload);
}

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
    getFacadeMethod("off")?.(eventName, handler);
  };
}

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

export { STATS };
