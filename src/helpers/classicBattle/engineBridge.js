import { emitBattleEvent } from "./battleEvents.js";
import * as engineFacade from "../battleEngineFacade.js";
import { STATS } from "../battleEngineFacade.js";

const trackedEngines = typeof WeakSet === "function" ? new WeakSet() : null;
const engineMarker =
  typeof Symbol === "function"
    ? Symbol("classicBattle.engineBridge.registered")
    : "__classicBattleEngineBridgeRegistered__";

function markEngineTracked(engine) {
  if (!engine || typeof engine !== "object") {
    return;
  }

  if (trackedEngines) {
    trackedEngines.add(engine);
    return;
  }

  if (engine[engineMarker]) {
    return;
  }

  try {
    Object.defineProperty(engine, engineMarker, {
      configurable: true,
      enumerable: false,
      value: true,
      writable: false
    });
  } catch {
    engine[engineMarker] = true;
  }
}

function isEngineTracked(engine) {
  if (!engine || typeof engine !== "object") {
    return false;
  }

  if (trackedEngines) {
    return trackedEngines.has(engine);
  }

  return Boolean(engine[engineMarker]);
}

function getTrackableEngine() {
  if (typeof engineFacade.requireEngine !== "function") {
    return null;
  }

  try {
    const engine = engineFacade.requireEngine();
    return engine && typeof engine === "object" ? engine : null;
  } catch (error) {
    const isProduction =
      typeof process !== "undefined" && process.env?.NODE_ENV === "production";
    if (!isProduction && typeof console?.warn === "function") {
      console.warn("[engineBridge] Failed to resolve engine instance", error);
    }
    return null;
  }
}

function handleRoundEnded(detail) {
  emitBattleEvent("roundResolved", detail);
  try {
    const player = Number(detail?.playerScore) || 0;
    const opponent = Number(detail?.opponentScore) || 0;
    emitBattleEvent("display.score.update", { player, opponent });
  } catch {}
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

function handleMatchEndedLegacy(detail) {
  emitBattleEvent("matchOver", detail);
}

function handleMatchEndedPrd(detail) {
  const outcome = detail?.outcome;
  const winner =
    outcome === "matchWinPlayer"
      ? "player"
      : outcome === "matchWinOpponent"
        ? "opponent"
        : "none";
  emitBattleEvent("match.concluded", {
    winner,
    scores: {
      player: Number(detail?.playerScore) || 0,
      opponent: Number(detail?.opponentScore) || 0
    },
    reason: outcome || "unknown"
  });
}

function handleMatchEnded(detail) {
  handleMatchEndedLegacy(detail);
  handleMatchEndedPrd(detail);
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
  const engine = getTrackableEngine();
  if (isEngineTracked(engine)) {
    return;
  }

  const onEngine = engineFacade.on;
  if (typeof onEngine !== "function") {
    return;
  }

  onEngine("roundEnded", handleRoundEnded);
  onEngine("matchEnded", handleMatchEnded);
  onEngine("roundStarted", handleRoundStarted);
  onEngine("timerTick", handleTimerTick);

  markEngineTracked(engine);
}
