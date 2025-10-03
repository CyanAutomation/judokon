import { emitBattleEvent } from "./battleEvents.js";
import * as engineFacade from "../battleEngineFacade.js";
import { updateScore } from "../setupScoreboard.js";

const trackedEngines = typeof WeakSet === "function" ? new WeakSet() : new Set();

function getEngineFacadeProperty(propName) {
  try {
    return engineFacade[propName];
  } catch {
    return undefined;
  }
}

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
  const stats = getEngineFacadeProperty("STATS");
  emitBattleEvent("round.started", {
    roundIndex: Number(detail?.round) || 0,
    availableStats: Array.isArray(stats) ? stats.slice() : []
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
    onEngine("matchEnded", handleMatchEndedLegacy);
    onEngine("roundStarted", handleRoundStarted);
    onEngine("timerTick", handleTimerTick);
    onEngine("matchEnded", handleMatchEndedPrd);

    if (engine) {
      trackedEngines.add(engine);
    }
  } catch {}
}

// Five attempts allow the facade module to finish bootstrapping across chained microtasks
// while preventing runaway retries during initialization failures.
const MAX_ENGINE_CREATED_REGISTRATION_ATTEMPTS = 5;
const scheduleMicrotask =
  globalThis.queueMicrotask || ((callback) => Promise.resolve().then(callback));

let hasRegisteredEngineCreatedHook = false;

/**
 * Register the classic battle bridge once the engine facade exposes `onEngineCreated`.
 *
 * @param {number} attempt - Current retry number (0-indexed).
 * @returns {boolean} Whether the registration was completed during this invocation.
 * @pseudocode
 * 1. Exit early when already registered.
 * 2. Read `onEngineCreated` from the engine facade.
 * 3. If available, subscribe and mark as registered.
 * 4. Otherwise, retry on the next microtask while attempts remain.
 * 5. Emit a console warning after exhausting retries for easier diagnostics.
 */
function registerBridgeOnEngineCreated(attempt = 0) {
  if (hasRegisteredEngineCreatedHook) {
    return true;
  }

  const onEngineCreated = getEngineFacadeProperty("onEngineCreated");
  if (typeof onEngineCreated === "function") {
    onEngineCreated(() => {
      try {
        bridgeEngineEvents();
      } catch {}
    });
    hasRegisteredEngineCreatedHook = true;
    return true;
  }

  if (attempt < MAX_ENGINE_CREATED_REGISTRATION_ATTEMPTS) {
    scheduleMicrotask(() => registerBridgeOnEngineCreated(attempt + 1));
  } else if (typeof console !== "undefined" && typeof console.warn === "function") {
    console.warn(
      "Failed to register engine bridge after maximum attempts. Engine facade may not be properly initialized."
    );
  }

  return false;
}

scheduleMicrotask(() => registerBridgeOnEngineCreated());
