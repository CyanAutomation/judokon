import { emitBattleEvent } from "./battleEvents.js";
import * as engineFacade from "../battleEngineFacade.js";
import { STATS } from "../battleEngineFacade.js";
import { updateScore } from "../setupScoreboard.js";

const trackedEngines = typeof WeakSet === "function" ? new WeakSet() : new Set();

function getTrackableEngine() {
  if (typeof engineFacade.requireEngine !== "function") {
    return null;
  }

  try {
    const engine = engineFacade.requireEngine();
    return engine && typeof engine === "object" ? engine : null;
  } catch {
    return null;
  }
}

function handleRoundEnded(detail) {
  emitBattleEvent("roundResolved", detail);
  try {
    const player = Number(detail?.playerScore) || 0;
    const opponent = Number(detail?.opponentScore) || 0;
    emitBattleEvent("display.score.update", { player, opponent });
    if (typeof updateScore === "function") {
      updateScore(player, opponent);
    }
  } catch {}
}

function handleMatchEndedLegacy(detail) {
  emitBattleEvent("matchOver", detail);
}

function handleRoundStarted(detail) {
  emitBattleEvent("round.started", {
    roundIndex: Number(detail?.round) || 0,
    availableStats: Array.isArray(STATS) ? STATS.slice() : []
  });
}

function handleTimerTick(detail) {
  const remaining = Number(detail?.remaining) || 0;
  if (detail?.phase === "round") {
    emitBattleEvent("round.timer.tick", { remainingMs: Math.max(0, remaining) * 1000 });
  } else if (detail?.phase === "cooldown") {
    emitBattleEvent("cooldown.timer.tick", { remainingMs: Math.max(0, remaining) * 1000 });
  }
}

function handleMatchEndedPrd(detail) {
  const outcome = detail?.outcome;
  const winner =
    outcome === "matchWinPlayer" ? "player" : outcome === "matchWinOpponent" ? "opponent" : "none";
  emitBattleEvent("match.concluded", {
    winner,
    scores: {
      player: Number(detail?.playerScore) || 0,
      opponent: Number(detail?.opponentScore) || 0
    },
    reason: outcome || "unknown"
  });
}

/**
 * Bridge events emitted by the battle engine to classic-battle `emitBattleEvent` names.
 *
 * This adapter listens on the engine facade and mirrors key lifecycle and timer
 * events onto the classic battle event bus so UI and orchestrator can observe them.
 *
 * @returns {void}
 * @pseudocode
 * 1. Obtain `engineFacade.on` and return early when not available.
 * 2. Subscribe to engine events (`roundEnded`, `matchEnded`, `roundStarted`, `timerTick`).
 * 3. For each engine event, emit corresponding `emitBattleEvent` with normalized detail.
 */
export function bridgeEngineEvents() {
  try {
    const engine = getTrackableEngine();
    if (engine && trackedEngines.has(engine)) {
      return;
    }
    const onEngine = engineFacade.on;
    if (typeof onEngine !== "function") return;
    onEngine("roundEnded", handleRoundEnded);
    roundEndedRegistered = true;
    onEngine("matchEnded", handleMatchEndedLegacy);
    onEngine("roundStarted", handleRoundStarted);
    onEngine("timerTick", handleTimerTick);
    onEngine("matchEnded", handleMatchEndedPrd);

    if (engine) {
      trackedEngines.add(engine);
    }
  } catch {}
}

const originalCreateBattleEngine =
  typeof engineFacade.createBattleEngine === "function" ? engineFacade.createBattleEngine : null;
const originalOnEngine =
  typeof engineFacade.on === "function" ? engineFacade.on : null;
let roundEndedRegistered = false;

if (originalOnEngine) {
  engineFacade.on = function wrappedOn(event, handler) {
    const result = originalOnEngine(event, handler);
    if (event === "roundEnded") {
      roundEndedRegistered = true;
    } else if (event === "matchEnded" && !roundEndedRegistered) {
      try {
        originalOnEngine("roundEnded", handleRoundEnded);
        roundEndedRegistered = true;
      } catch {}
    }
    return result;
  };
}

if (originalCreateBattleEngine) {
  engineFacade.createBattleEngine = function wrappedCreateBattleEngine(...args) {
    const engine = originalCreateBattleEngine(...args);
    roundEndedRegistered = false;
    try {
      bridgeEngineEvents();
    } catch {}
    return engine;
  };
}
