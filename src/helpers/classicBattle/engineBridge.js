import { emitBattleEvent } from "./battleEvents.js";
import * as engineFacade from "../battleEngineFacade.js";
import { STATS } from "../battleEngineFacade.js";

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
    const onEngine = engineFacade.on;
    if (typeof onEngine !== "function") return;
    // Legacy bridge → classic events
    onEngine("roundEnded", (detail) => {
      emitBattleEvent("roundResolved", detail);
      // Also emit display.score.update for scoreboard
      try {
        const player = Number(detail?.playerScore) || 0;
        const opponent = Number(detail?.opponentScore) || 0;
        emitBattleEvent("display.score.update", { player, opponent });
      } catch {}
    });
    onEngine("matchEnded", (detail) => {
      emitBattleEvent("matchOver", detail);
    });
    // PRD taxonomy bridge → dot-namespaced events
    onEngine("roundStarted", (detail) => {
      // Emit `round.started({ roundIndex, availableStats })`
      emitBattleEvent("round.started", {
        roundIndex: Number(detail?.round) || 0,
        availableStats: Array.isArray(STATS) ? STATS.slice() : []
      });
    });
    onEngine("timerTick", (detail) => {
      const remaining = Number(detail?.remaining) || 0;
      if (detail?.phase === "round") {
        emitBattleEvent("round.timer.tick", { remainingMs: Math.max(0, remaining) * 1000 });
      } else if (detail?.phase === "cooldown") {
        // Prefer orchestrator emission for cooldown ticks, but mirror here when available
        emitBattleEvent("cooldown.timer.tick", { remainingMs: Math.max(0, remaining) * 1000 });
      }
    });
    onEngine("matchEnded", (detail) => {
      // Also emit PRD match.concluded with winner + scores
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
    });
  } catch {}
}
