import { roundStore } from "./roundStore.js";
import { onBattleEvent, offBattleEvent } from "./battleEvents.js";
import {
  showMessage,
  clearMessage,
  showTemporaryMessage,
  clearTimer,
  updateTimer,
  showAutoSelect,
  updateRoundCounter,
  clearRoundCounter,
  updateScore
} from "../setupScoreboard.js";

let bound = false;
let scoreboardReadyPromise = Promise.resolve();
let legacyHandlers = [];

/**
 * Await the completion of scoreboard adapter wiring.
 *
 * @pseudocode
 * 1. Return the promise tracking the scoreboard wiring lifecycle.
 *
 * @returns {Promise<void>} Resolves once scoreboard integration hooks are ready
 */
export function whenScoreboardReady() {
  return scoreboardReadyPromise;
}

/**
 * Initialize the Scoreboard event adapter.
 *
 * @pseudocode
 * 1. Guard against double-binding.
 * 2. Wire RoundStore into scoreboard for centralized state management.
 * 3. Return a disposer that removes all listeners.
 *
 * @returns {() => void} dispose function to remove listeners
 */
export function initScoreboardAdapter() {
  if (bound) {
    return disposeScoreboardAdapter;
  }
  bound = true;

  scoreboardReadyPromise = Promise.resolve(roundStore.wireIntoScoreboardAdapter());

  const bind = (event, handler) => {
    legacyHandlers.push([event, handler]);
    onBattleEvent(event, handler);
  };

  bind("display.round.start", (e) => {
    try {
      clearMessage();
      const detail = e?.detail || {};
      const roundNumber =
        typeof detail.roundNumber === "number" ? detail.roundNumber : detail.roundIndex;
      if (typeof roundNumber === "number") {
        updateRoundCounter(roundNumber);
      } else {
        clearRoundCounter();
      }
    } catch {}
  });

  bind("display.round.message", (e) => {
    try {
      const { text, lock } = e?.detail || {};
      if (typeof text === "string" && text.length > 0) {
        showMessage(text, { outcome: lock === true });
      } else {
        clearMessage();
      }
    } catch {}
  });

  bind("display.round.outcome", (e) => {
    try {
      const { text } = e?.detail || {};
      showMessage(typeof text === "string" ? text : "", { outcome: true });
    } catch {}
  });

  bind("display.message.clear", () => {
    try {
      clearMessage();
    } catch {}
  });

  bind("display.timer.show", (e) => {
    try {
      const seconds = Number(e?.detail?.secondsRemaining);
      if (Number.isFinite(seconds)) {
        updateTimer(seconds);
      }
    } catch {}
  });

  bind("display.timer.tick", (e) => {
    try {
      const seconds = Number(e?.detail?.secondsRemaining);
      if (Number.isFinite(seconds)) {
        updateTimer(seconds);
      }
    } catch {}
  });

  bind("display.timer.hide", () => {
    try {
      clearTimer();
    } catch {}
  });

  bind("display.score.update", (e) => {
    try {
      const { player, opponent } = e?.detail || {};
      if (typeof player === "number" && typeof opponent === "number") {
        updateScore(player, opponent);
      }
    } catch {}
  });

  bind("display.autoSelect.show", (e) => {
    try {
      const stat = e?.detail?.stat;
      if (typeof stat === "string" && stat) {
        showAutoSelect(stat);
      }
    } catch {}
  });

  bind("display.tempMessage", (e) => {
    try {
      const text = e?.detail?.text;
      if (typeof text === "string") {
        showTemporaryMessage(text);
      }
    } catch {}
  });

  return disposeScoreboardAdapter;
}

/**
 * Remove all adapter listeners.
 *
 * @pseudocode
 * 1. Reset RoundStore scoreboard-related callbacks.
 * 2. Clear the bound flag and reset the ready promise.
 * @returns {void}
 */
export function disposeScoreboardAdapter() {
  // Clean up RoundStore integration
  try {
    roundStore.disconnectFromScoreboardAdapter();
  } catch {}

  if (legacyHandlers.length > 0) {
    for (const [event, handler] of legacyHandlers) {
      try {
        offBattleEvent(event, handler);
      } catch {}
    }
    legacyHandlers = [];
  }

  bound = false;
  scoreboardReadyPromise = Promise.resolve();
}

export default initScoreboardAdapter;
