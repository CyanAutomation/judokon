import { onBattleEvent, offBattleEvent } from "./classicBattle/battleEvents.js";
import { updateScore, getState as _getState } from "../components/Scoreboard.js";
import {
  showMessage,
  updateTimer,
  updateRoundCounter,
  clearRoundCounter,
  showTemporaryMessage
} from "./roundStatusDisplay.js";
import { getScheduler } from "./scheduler.js";

// Event names
const EVENTS = {
  ROUND_STARTED: "round.started",
  ROUND_TIMER_TICK: "round.timer.tick",
  COOLDOWN_TIMER_TICK: "cooldown.timer.tick",
  ROUND_EVALUATED: "round.evaluated",
  MATCH_CONCLUDED: "match.concluded",
  CONTROL_STATE_CHANGED: "control.state.changed"
};

let _bound = false;
let _currentState = null;
// eslint-disable-next-line no-unused-vars -- Reserved for future API or debugging
let _lastOutcome = "none";
let _lastRoundIndex = 0;
let _handlers = [];
let _waitingTimer = null;
let _waitingClearer = null;
let _onResetUi = null;

/**
 * Detects if the application is running in CLI mode.
 *
 * @returns {boolean} - True if CLI mode is active.
 */
const isCliMode = () => !!document.getElementById("cli-countdown");

/**
 * Safely parses a value to a finite number.
 *
 * @param {unknown} value - The value to parse.
 * @param {number} [fallback=0] - The fallback value if parsing fails.
 * @returns {number} - The parsed number or fallback.
 */
const safeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Safely extracts event detail with fallback to empty object.
 *
 * @param {Event} event - The event object.
 * @returns {object} - The detail object or empty object.
 */
const getEventDetail = (event) => event?.detail || {};

/**
 * Safely normalizes outcome string to a standard enum.
 *
 * @param {string|unknown} outcome - The raw outcome value.
 * @returns {'playerWin'|'opponentWin'|'draw'|'none'} - Normalized outcome enum.
 */
const mapOutcomeToEnum = (outcome) => {
  const s = String(outcome || "");
  if (/player/i.test(s)) return "playerWin";
  if (/opponent/i.test(s)) return "opponentWin";
  if (/draw/i.test(s)) return "draw";
  return "none";
};

/**
 * Extracts and validates round number from event detail.
 *
 * @param {object} detail - The event detail object.
 * @returns {number|null} - The round number or null if invalid.
 */
const extractRoundNumber = (detail) => {
  const n = typeof detail.roundIndex === "number" ? detail.roundIndex : detail.roundNumber;
  return typeof n === "number" ? n : null;
};

/**
 * Checks if a round number is new (greater than the last observed).
 *
 * @param {number|null} roundNumber - The round number to check.
 * @returns {boolean} - True if it's a new round.
 */
const isNewRound = (roundNumber) => {
  if (typeof roundNumber !== "number" || roundNumber < 0) return false;
  return roundNumber > _lastRoundIndex;
};

/**
 * Extracts player and opponent scores from event detail.
 *
 * @param {object} detail - The event detail object.
 * @returns {{player: number, opponent: number}} - Extracted scores.
 */
const extractScores = (detail) => {
  return {
    player: safeNumber(detail?.scores?.player),
    opponent: safeNumber(detail?.scores?.opponent)
  };
};

/**
 * Displays outcome information and optional message.
 *
 * @param {string|unknown} outcomeRaw - The raw outcome value.
 * @param {string} [message] - Optional message to display.
 */
const displayOutcome = (outcomeRaw, message) => {
  const outcomeType = mapOutcomeToEnum(outcomeRaw);
  _lastOutcome = outcomeType;
  if (message) {
    showMessage(String(message), { outcome: true, outcomeType });
  } else {
    showMessage("", { outcome: true, outcomeType });
  }
};

/**
 * Cancels the waiting message timeout and clears the temporary message.
 */
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

/**
 * Registers a window event listener to reset the UI and reset round counter on game:reset-ui.
 */
function registerResetUiListener() {
  if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
    return;
  }
  if (_onResetUi) {
    return;
  }
  const handler = () => {
    _lastRoundIndex = 0;
    try {
      clearRoundCounter();
    } catch {}
  };
  _onResetUi = handler;
  try {
    window.addEventListener("game:reset-ui", handler);
  } catch {
    _onResetUi = null;
  }
}

/**
 * Unregisters the window event listener for game:reset-ui.
 */
function unregisterResetUiListener() {
  if (typeof window === "undefined" || typeof window.removeEventListener !== "function") {
    _onResetUi = null;
    return;
  }
  if (!_onResetUi) {
    return;
  }
  try {
    window.removeEventListener("game:reset-ui", _onResetUi);
  } catch {}
  _onResetUi = null;
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
  registerResetUiListener();
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

  // round.started → round counter (skip in CLI mode)
  on(EVENTS.ROUND_STARTED, (e) => {
    _cancelWaiting();
    try {
      const d = getEventDetail(e);
      const roundNum = extractRoundNumber(d);
      if (isNewRound(roundNum)) {
        if (!isCliMode()) updateRoundCounter(roundNum);
        _lastRoundIndex = roundNum;
      }
      // Ensure root outcome resets to none at round start
      displayOutcome("none");
    } catch {}
  });

  // round.timer.tick and cooldown.timer.tick → header timer (seconds)
  // Skip timer updates in CLI mode (battleCLI handles its own timer display)
  if (!isCliMode()) {
    const handleTimerTick = (e) => {
      _cancelWaiting();
      try {
        const ms = safeNumber(e?.detail?.remainingMs);
        updateTimer(Math.max(0, Math.round(ms / 1000)));
      } catch {}
    };

    on(EVENTS.ROUND_TIMER_TICK, handleTimerTick);
    on(EVENTS.COOLDOWN_TIMER_TICK, handleTimerTick);
  }

  // round.evaluated → scores (+ optional message)
  on(EVENTS.ROUND_EVALUATED, (e) => {
    _cancelWaiting();
    try {
      const d = getEventDetail(e);
      const message = d?.message ?? d?.result?.message;
      const outcome = d?.outcome ?? d?.result?.outcome;
      const scores =
        d?.scores ||
        (d?.result
          ? {
              player: d.result.playerScore,
              opponent: d.result.opponentScore
            }
          : undefined);
      const { player, opponent } = extractScores({ scores });
      updateScore(player, opponent);
      displayOutcome(outcome, message);
    } catch {}
  });

  // match.concluded → final scores + clear round counter (+ optional message)
  on(EVENTS.MATCH_CONCLUDED, (e) => {
    _cancelWaiting();
    try {
      const d = getEventDetail(e);
      const { player, opponent } = extractScores(d);
      updateScore(player, opponent);
      clearRoundCounter();
      displayOutcome(d?.winner || d?.reason, d.message);
    } catch {}
  });

  // control.state.changed reserved for Phase 2
  on(EVENTS.CONTROL_STATE_CHANGED, (e) => {
    _cancelWaiting();
    try {
      const to = e?.detail?.to;
      _currentState = to || _currentState;
      if (to === "selection" || to === "roundSelect" || to === "roundWait") {
        // Clear outcome on authoritative transition back to selection/cooldown
        displayOutcome("none");
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
  _cancelWaiting();
  for (const [type, fn] of _handlers) {
    try {
      offBattleEvent(type, fn);
    } catch {}
  }
  _handlers = [];

  _bound = false;
  unregisterResetUiListener();
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
