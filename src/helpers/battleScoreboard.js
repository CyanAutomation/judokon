import { onBattleEvent, offBattleEvent } from "./classicBattle/battleEvents.js";
import {
  showMessage,
  updateScore,
  updateTimer,
  updateRoundCounter,
  clearRoundCounter,
  showTemporaryMessage,
  getState as _getState
} from "../components/Scoreboard.js";
import { getScheduler } from "./scheduler.js";

let _bound = false;
let _handlers = [];
// Schedule fallback message if no state is observed within 500ms
try {
  const scheduler = getScheduler();
  _waitingTimer = scheduler.setTimeout(() => {
    try {
      _waitingClearer =
        typeof showTemporaryMessage === "function" ? showTemporaryMessage("Waiting…") : null;
    } catch {}
  }, 500);
} catch {}

let _state = { current: null, lastOutcome: "none" };
let _lastRoundIndex = 0;
let _waitingTimer = null;
let _waitingClearer = null;
function _cancelWaiting() {
  try {
    if (_waitingTimer) {
      const scheduler = getScheduler();
      scheduler.clearTimeout(_waitingTimer);
    }
  } catch {}
  _waitingTimer = null;
  try {
    if (typeof _waitingClearer === "function") {
      _waitingClearer();
    }
  } catch {}
  _waitingClearer = null;
}
function mapOutcomeToEnum(outcome) {
  const s = String(outcome || "");
  if (/player/i.test(s)) return "playerWin";
  if (/opponent/i.test(s)) return "opponentWin";
  if (/draw/i.test(s)) return "draw";
  return "none";
}

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
  // Schedule fallback message if no state is observed within 500ms
  try {
    const scheduler = getScheduler();
    _waitingTimer = scheduler.setTimeout(() => {
      try {
        _waitingClearer =
          typeof showTemporaryMessage === "function" ? showTemporaryMessage("Waiting…") : null;
      } catch {}
    }, 500);
  } catch {}

  const on = (type, fn) => {
    _handlers.push([type, fn]);
    onBattleEvent(type, fn);
  };

  // round.started → round counter
  on("round.started", (e) => {
    _cancelWaiting();
    try {
      const d = e?.detail || {};
      const n = typeof d.roundIndex === "number" ? d.roundIndex : d.roundNumber;
      if (typeof n === "number" && n > _lastRoundIndex) {
        updateRoundCounter(n);
        _lastRoundIndex = n;
      }
      // Ensure root outcome resets to none at round start
      showMessage("", { outcome: true, outcomeType: "none" });
    } catch {}
  });

  // round.timer.tick → header timer (seconds)
  on("round.timer.tick", (e) => {
    _cancelWaiting();
    try {
      const ms = Number(e?.detail?.remainingMs);
      if (Number.isFinite(ms)) updateTimer(Math.max(0, Math.round(ms / 1000)));
    } catch {}
  });

  // round.evaluated → scores (+ optional message)
  on("round.evaluated", (e) => {
    _cancelWaiting();
    try {
      const d = e?.detail || {};
      const p = Number(d?.scores?.player) || 0;
      const o = Number(d?.scores?.opponent) || 0;
      updateScore(p, o);
      const outcomeType = mapOutcomeToEnum(d?.outcome);
      _state.lastOutcome = outcomeType;
      if (d.message) showMessage(String(d.message), { outcome: true, outcomeType });
      else showMessage("", { outcome: true, outcomeType });
    } catch {}
  });

  // match.concluded → final scores + clear round counter (+ optional message)
  on("match.concluded", (e) => {
    _cancelWaiting();
    try {
      const d = e?.detail || {};
      const p = Number(d?.scores?.player) || 0;
      const o = Number(d?.scores?.opponent) || 0;
      updateScore(p, o);
      clearRoundCounter();
      const outcomeType = mapOutcomeToEnum(d?.winner || d?.reason);
      _state.lastOutcome = outcomeType;
      if (d.message) showMessage(String(d.message), { outcome: true, outcomeType });
      else showMessage("", { outcome: true, outcomeType });
    } catch {}
  });

  // control.state.changed reserved for Phase 2
  on("control.state.changed", (e) => {
    _cancelWaiting();
    try {
      const to = e?.detail?.to;
      _state.current = to || _state.current;
      if (to === "selection" || to === "cooldown") {
        // Clear outcome on authoritative transition back to selection/cooldown
        showMessage("", { outcome: true, outcomeType: "none" });
        _state.lastOutcome = "none";
      }
    } catch {}
  });

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
  // Schedule fallback message if no state is observed within 500ms
  try {
    const scheduler = getScheduler();
    _waitingTimer = scheduler.setTimeout(() => {
      try {
        _waitingClearer =
          typeof showTemporaryMessage === "function" ? showTemporaryMessage("Waiting…") : null;
      } catch {}
    }, 500);
  } catch {}

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
