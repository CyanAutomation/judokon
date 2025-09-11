import { onBattleEvent, offBattleEvent } from "./classicBattle/battleEvents.js";
import {
  showMessage,
  updateScore,
  updateTimer,
  updateRoundCounter,
  clearRoundCounter,
  getState as _getState
} from "../components/Scoreboard.js";

let _bound = false;
let _handlers = [];

/**
 * Initialize the scoreboard PRD adapter.
 *
 * @pseudocode
 * 1. Guard against double-binding.
 * 2. Subscribe to PRD events and forward data to Scoreboard API.
 * 3. Return a disposer that removes all listeners.
 * @returns {() => void} dispose function
 */
export function initBattleScoreboardAdapter() {
  if (_bound) return disposeBattleScoreboardAdapter;
  _bound = true;
  _handlers = [];

  const on = (type, fn) => {
    _handlers.push([type, fn]);
    onBattleEvent(type, fn);
  };

  // round.started → round counter
  on("round.started", (e) => {
    try {
      const d = e?.detail || {};
      const n = typeof d.roundIndex === "number" ? d.roundIndex : d.roundNumber;
      if (typeof n === "number") updateRoundCounter(n);
    } catch {}
  });

  // round.timer.tick → header timer (seconds)
  on("round.timer.tick", (e) => {
    try {
      const ms = Number(e?.detail?.remainingMs);
      if (Number.isFinite(ms)) updateTimer(Math.max(0, Math.round(ms / 1000)));
    } catch {}
  });

  // round.evaluated → scores (+ optional message)
  on("round.evaluated", (e) => {
    try {
      const d = e?.detail || {};
      const p = Number(d?.scores?.player) || 0;
      const o = Number(d?.scores?.opponent) || 0;
      updateScore(p, o);
      if (d.message) showMessage(String(d.message), { outcome: true });
    } catch {}
  });

  // match.concluded → final scores + clear round counter (+ optional message)
  on("match.concluded", (e) => {
    try {
      const d = e?.detail || {};
      const p = Number(d?.scores?.player) || 0;
      const o = Number(d?.scores?.opponent) || 0;
      updateScore(p, o);
      clearRoundCounter();
      if (d.message) showMessage(String(d.message), { outcome: true });
    } catch {}
  });

  // control.state.changed reserved for Phase 2
  on("control.state.changed", () => {});

  return disposeBattleScoreboardAdapter;
}

/**
 * Dispose scoreboard adapter listeners.
 *
 * @pseudocode
 * 1. Unsubscribe all stored handlers.
 * 2. Clear handler list and bound flag.
 * @returns {void}
 */
export function disposeBattleScoreboardAdapter() {
  for (const [type, fn] of _handlers) {
    try {
      offBattleEvent(type, fn);
    } catch {}
  }
  _handlers = [];
  _bound = false;
}

/**
 * Return current scoreboard snapshot (alias for PRD naming).
 *
 * @pseudocode
 * 1. Delegate to `Scoreboard.getState()`.
 * 2. Return the result.
 * @returns {ReturnType<typeof _getState>}
 */
export function getSnapshot() {
  return _getState();
}
