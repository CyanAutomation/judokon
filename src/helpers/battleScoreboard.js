import { onBattleEvent, offBattleEvent } from "./classicBattle/battleEvents.js";import { onBattleEvent, offBattleEvent } from "./classicBattle/battleEvents.js";

import {import {

  showMessage,  showMessage,

  updateScore,  updateScore,

  updateTimer,  updateTimer,

  updateRoundCounter,  updateRoundCounter,

  clearRoundCounter,  clearRoundCounter,

  showTemporaryMessage,  showTemporaryMessage,

  getState as _getState  getState as _getState

} from "../components/Scoreboard.js";} from "../components/Scoreboard.js";

import { getScheduler } from "./scheduler.js";import { getScheduler } from "./scheduler.js";



// Event nameslet _bound = false;

const EVENTS = {let _state = { current: null, lastOutcome: "none" };

  ROUND_STARTED: "round.started",let _lastRoundIndex = 0;

  ROUND_TIMER_TICK: "round.timer.tick",let _handlers = [];

  COOLDOWN_TIMER_TICK: "cooldown.timer.tick",let _waitingTimer = null;

  ROUND_EVALUATED: "round.evaluated",let _waitingClearer = null;

  MATCH_CONCLUDED: "match.concluded",let _onResetUi = null;

  CONTROL_STATE_CHANGED: "control.state.changed"// Schedule fallback message if no state is observed within 500ms

};try {

  const scheduler = getScheduler();

let _bound = false;  _waitingTimer = scheduler.setTimeout(() => {

let _currentState = null;    try {

// eslint-disable-next-line no-unused-vars -- Reserved for future API or debugging      _waitingClearer =

let _lastOutcome = "none";        typeof showTemporaryMessage === "function" ? showTemporaryMessage("Waiting…") : null;

let _lastRoundIndex = 0;    } catch {}

let _handlers = [];  }, 500);

let _waitingTimer = null;} catch {}

let _waitingClearer = null;function _cancelWaiting() {

let _onResetUi = null;  try {

    if (_waitingTimer) {

/**      const scheduler = getScheduler();

 * Detects if the application is running in CLI mode.      scheduler.clearTimeout(_waitingTimer);

 *    }

 * @returns {boolean} - True if CLI mode is active.  } catch {}

 */  _waitingTimer = null;

const isCliMode = () => !!document.getElementById("cli-countdown");  try {

    if (typeof _waitingClearer === "function") {

/**      _waitingClearer();

 * Safely parses a value to a finite number.    }

 *  } catch {}

 * @param {unknown} value - The value to parse.  _waitingClearer = null;

 * @param {number} [fallback=0] - The fallback value if parsing fails.}

 * @returns {number} - The parsed number or fallback.function mapOutcomeToEnum(outcome) {

 */  const s = String(outcome || "");

const safeNumber = (value, fallback = 0) => {  if (/player/i.test(s)) return "playerWin";

  const n = Number(value);  if (/opponent/i.test(s)) return "opponentWin";

  return Number.isFinite(n) ? n : fallback;  if (/draw/i.test(s)) return "draw";

};  return "none";

}

/**

 * Safely extracts event detail with fallback to empty object.function registerResetUiListener() {

 *  if (typeof window === "undefined" || typeof window.addEventListener !== "function") {

 * @param {Event} event - The event object.    return;

 * @returns {object} - The detail object or empty object.  }

 */  if (_onResetUi) {

const getEventDetail = (event) => event?.detail || {};    return;

  }

/**  const handler = () => {

 * Safely normalizes outcome string to a standard enum.    _lastRoundIndex = 0;

 *    try {

 * @param {string|unknown} outcome - The raw outcome value.      clearRoundCounter();

 * @returns {'playerWin'|'opponentWin'|'draw'|'none'} - Normalized outcome enum.    } catch {}

 */  };

const mapOutcomeToEnum = (outcome) => {  _onResetUi = handler;

  const s = String(outcome || "");  try {

  if (/player/i.test(s)) return "playerWin";    window.addEventListener("game:reset-ui", handler);

  if (/opponent/i.test(s)) return "opponentWin";  } catch {

  if (/draw/i.test(s)) return "draw";    _onResetUi = null;

  return "none";  }

};}



/**function unregisterResetUiListener() {

 * Extracts and validates round number from event detail.  if (typeof window === "undefined" || typeof window.removeEventListener !== "function") {

 *    _onResetUi = null;

 * @param {object} detail - The event detail object.    return;

 * @returns {number|null} - The round number or null if invalid.  }

 */  if (!_onResetUi) {

const extractRoundNumber = (detail) => {    return;

  const n = typeof detail.roundIndex === "number" ? detail.roundIndex : detail.roundNumber;  }

  return typeof n === "number" ? n : null;  try {

};    window.removeEventListener("game:reset-ui", _onResetUi);

  } catch {}

/**  _onResetUi = null;

 * Checks if a round number is new (greater than the last observed).}

 *

 * @param {number|null} roundNumber - The round number to check./**

 * @returns {boolean} - True if it's a new round. * Initialize the scoreboard PRD adapter.

 */ *

const isNewRound = (roundNumber) => { * @pseudocode

  if (typeof roundNumber !== "number" || roundNumber < 0) return false; * 1. Guard against double-binding.

  return roundNumber > _lastRoundIndex; * 2. Subscribe to PRD events and forward data to Scoreboard API.

}; * 3. Return a disposer that removes all listeners.

 * @returns {() => void} dispose function

/** */

 * Extracts player and opponent scores from event detail.export function initBattleScoreboardAdapter() {

 *  if (_bound) return disposeBattleScoreboardAdapter;

 * @param {object} detail - The event detail object.  _bound = true;

 * @returns {{player: number, opponent: number}} - Extracted scores.  _handlers = [];

 */  registerResetUiListener();

const extractScores = (detail) => {  // Schedule fallback message if no state is observed within 500ms

  return {  try {

    player: safeNumber(detail?.scores?.player),    const scheduler = getScheduler();

    opponent: safeNumber(detail?.scores?.opponent)    _waitingTimer = scheduler.setTimeout(() => {

  };      try {

};        _waitingClearer =

          typeof showTemporaryMessage === "function" ? showTemporaryMessage("Waiting…") : null;

/**      } catch {}

 * Displays outcome information and optional message.    }, 500);

 *  } catch {}

 * @param {string|unknown} outcomeRaw - The raw outcome value.

 * @param {string} [message] - Optional message to display.  const on = (type, fn) => {

 */    _handlers.push([type, fn]);

const displayOutcome = (outcomeRaw, message) => {    onBattleEvent(type, fn);

  const outcomeType = mapOutcomeToEnum(outcomeRaw);  };

  _lastOutcome = outcomeType;

  if (message) {  // round.started → round counter

    showMessage(String(message), { outcome: true, outcomeType });  // Skip in CLI mode (battleCLI handles its own round counter display with target info)

  } else {  if (!document.getElementById("cli-countdown")) {

    showMessage("", { outcome: true, outcomeType });    on("round.started", (e) => {

  }      _cancelWaiting();

};      try {

        const d = e?.detail || {};

/**        const n = typeof d.roundIndex === "number" ? d.roundIndex : d.roundNumber;

 * Cancels the waiting message timeout and clears the temporary message.        if (typeof n === "number" && n > _lastRoundIndex) {

 */          updateRoundCounter(n);

function _cancelWaiting() {          _lastRoundIndex = n;

  try {        }

    if (_waitingTimer) {        // Ensure root outcome resets to none at round start

      const scheduler = getScheduler();        showMessage("", { outcome: true, outcomeType: "none" });

      scheduler.clearTimeout(_waitingTimer);      } catch {}

    }    });

  } catch {}  } else {

  _waitingTimer = null;    // In CLI mode, still subscribe to round.started to clear messages and update outcome

  try {    on("round.started", (e) => {

    if (typeof _waitingClearer === "function") {      _cancelWaiting();

      _waitingClearer();      try {

    }        const d = e?.detail || {};

  } catch {}        const n = typeof d.roundIndex === "number" ? d.roundIndex : d.roundNumber;

  _waitingClearer = null;        if (typeof n === "number" && n > _lastRoundIndex) {

}          _lastRoundIndex = n;

        }

/**        // Ensure root outcome resets to none at round start (but don't update CLI counter)

 * Registers a window event listener to reset the UI and reset round counter on game:reset-ui.        showMessage("", { outcome: true, outcomeType: "none" });

 */      } catch {}

function registerResetUiListener() {    });

  if (typeof window === "undefined" || typeof window.addEventListener !== "function") {  }

    return;

  }  // round.timer.tick and cooldown.timer.tick → header timer (seconds)

  if (_onResetUi) {  // Skip timer updates in CLI mode (battleCLI handles its own timer display)

    return;  if (!document.getElementById("cli-countdown")) {

  }    const handleTimerTick = (e) => {

  const handler = () => {      _cancelWaiting();

    _lastRoundIndex = 0;      try {

    try {        const ms = Number(e?.detail?.remainingMs);

      clearRoundCounter();        if (Number.isFinite(ms)) updateTimer(Math.max(0, Math.round(ms / 1000)));

    } catch {}      } catch {}

  };    };

  _onResetUi = handler;

  try {    on("round.timer.tick", handleTimerTick);

    window.addEventListener("game:reset-ui", handler);    on("cooldown.timer.tick", handleTimerTick);

  } catch {  }

    _onResetUi = null;

  }  // round.evaluated → scores (+ optional message)

}  on("round.evaluated", (e) => {

    _cancelWaiting();

/**    try {

 * Unregisters the window event listener for game:reset-ui.      const d = e?.detail || {};

 */      const p = Number(d?.scores?.player) || 0;

function unregisterResetUiListener() {      const o = Number(d?.scores?.opponent) || 0;

  if (typeof window === "undefined" || typeof window.removeEventListener !== "function") {      updateScore(p, o);

    _onResetUi = null;      const outcomeType = mapOutcomeToEnum(d?.outcome);

    return;      _state.lastOutcome = outcomeType;

  }      if (d.message) showMessage(String(d.message), { outcome: true, outcomeType });

  if (!_onResetUi) {      else showMessage("", { outcome: true, outcomeType });

    return;    } catch {}

  }  });

  try {

    window.removeEventListener("game:reset-ui", _onResetUi);  // match.concluded → final scores + clear round counter (+ optional message)

  } catch {}  on("match.concluded", (e) => {

  _onResetUi = null;    _cancelWaiting();

}    try {

      const d = e?.detail || {};

/**      const p = Number(d?.scores?.player) || 0;

 * Initialize the scoreboard PRD adapter.      const o = Number(d?.scores?.opponent) || 0;

 *      updateScore(p, o);

 * @pseudocode      clearRoundCounter();

 * 1. Guard against double-binding.      const outcomeType = mapOutcomeToEnum(d?.winner || d?.reason);

 * 2. Subscribe to PRD events and forward data to Scoreboard API.      _state.lastOutcome = outcomeType;

 * 3. Return a disposer that removes all listeners.      if (d.message) showMessage(String(d.message), { outcome: true, outcomeType });

 * @returns {() => void} dispose function      else showMessage("", { outcome: true, outcomeType });

 */    } catch {}

export function initBattleScoreboardAdapter() {  });

  if (_bound) return disposeBattleScoreboardAdapter;

  _bound = true;  // control.state.changed reserved for Phase 2

  _handlers = [];  on("control.state.changed", (e) => {

  registerResetUiListener();    _cancelWaiting();

  // Schedule fallback message if no state is observed within 500ms    try {

  try {      const to = e?.detail?.to;

    const scheduler = getScheduler();      _state.current = to || _state.current;

    _waitingTimer = scheduler.setTimeout(() => {      if (to === "selection" || to === "cooldown") {

      try {        // Clear outcome on authoritative transition back to selection/cooldown

        _waitingClearer =        showMessage("", { outcome: true, outcomeType: "none" });

          typeof showTemporaryMessage === "function" ? showTemporaryMessage("Waiting…") : null;        _state.lastOutcome = "none";

      } catch {}      }

    }, 500);    } catch {}

  } catch {}  });



  const on = (type, fn) => {  return disposeBattleScoreboardAdapter;

    _handlers.push([type, fn]);}

    onBattleEvent(type, fn);

  };/**

 * Dispose scoreboard adapter listeners.

  // round.started → round counter (skip in CLI mode) *

  on(EVENTS.ROUND_STARTED, (e) => { * @pseudocode

    _cancelWaiting(); * 1. Unsubscribe all stored handlers.

    try { * 2. Clear handler list and bound flag.

      const d = getEventDetail(e); * @returns {void}

      const roundNum = extractRoundNumber(d); */

      if (isNewRound(roundNum)) {export function disposeBattleScoreboardAdapter() {

        if (!isCliMode()) updateRoundCounter(roundNum);  _cancelWaiting();

        _lastRoundIndex = roundNum;  for (const [type, fn] of _handlers) {

      }    try {

      // Ensure root outcome resets to none at round start      offBattleEvent(type, fn);

      displayOutcome("none");    } catch {}

    } catch {}  }

  });  _handlers = [];



  // round.timer.tick and cooldown.timer.tick → header timer (seconds)  _bound = false;

  // Skip timer updates in CLI mode (battleCLI handles its own timer display)  unregisterResetUiListener();

  if (!isCliMode()) {}

    const handleTimerTick = (e) => {

      _cancelWaiting();/**

      try { * Return current scoreboard snapshot (alias for PRD naming).

        const ms = safeNumber(e?.detail?.remainingMs); *

        updateTimer(Math.max(0, Math.round(ms / 1000))); * @pseudocode

      } catch {} * 1. Delegate to `Scoreboard.getState()`.

    }; * 2. Return the result.

 * @returns {ReturnType<typeof _getState>}

    on(EVENTS.ROUND_TIMER_TICK, handleTimerTick); */

    on(EVENTS.COOLDOWN_TIMER_TICK, handleTimerTick);export function getSnapshot() {

  }  return _getState();

}

  // round.evaluated → scores (+ optional message)
  on(EVENTS.ROUND_EVALUATED, (e) => {
    _cancelWaiting();
    try {
      const d = getEventDetail(e);
      const { player, opponent } = extractScores(d);
      updateScore(player, opponent);
      displayOutcome(d?.outcome, d.message);
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
      if (to === "selection" || to === "cooldown") {
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
