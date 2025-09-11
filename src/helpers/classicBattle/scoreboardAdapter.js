import { onBattleEvent, offBattleEvent } from "./battleEvents.js";
import {
  showMessage,
  clearMessage,
  updateTimer,
  clearTimer,
  updateScore,
  updateRoundCounter
} from "../setupScoreboard.js";

let bound = false;
const handlers = [];

function bind(type, fn) {
  handlers.push({ type, fn });
  onBattleEvent(type, fn);
}

/**
 * Initialize the Scoreboard event adapter.
 *
 * @pseudocode
 * 1. Guard against double-binding.
 * 2. Subscribe to PRD display.* events and map them to Scoreboard API calls.
 * 3. Return a disposer that removes all listeners.
 *
 * @returns {() => void} dispose function to remove listeners
 */
export function initScoreboardAdapter() {
  if (bound) {
    return disposeScoreboardAdapter;
  }
  bound = true;
  // Round lifecycle
  bind("display.round.start", (e) => {
    try {
      clearMessage();
      const n = e?.detail?.roundNumber;
      if (typeof n === "number") updateRoundCounter(n);
    } catch {}
  });
  bind("display.round.message", (e) => {
    try {
      const { text, lock } = e?.detail || {};
      showMessage(String(text ?? ""), { outcome: !!lock });
    } catch {}
  });
  bind("display.round.outcome", (e) => {
    try {
      const { text } = e?.detail || {};
      showMessage(String(text ?? ""), { outcome: true });
    } catch {}
  });
  bind("display.message.clear", () => {
    try {
      clearMessage();
    } catch {}
  });

  // Timer lifecycle
  bind("display.timer.show", (e) => {
    try {
      const s = e?.detail?.secondsRemaining;
      if (typeof s === "number") updateTimer(s);
    } catch {}
  });
  bind("display.timer.tick", (e) => {
    try {
      const s = e?.detail?.secondsRemaining;
      if (typeof s === "number") updateTimer(s);
    } catch {}
  });
  bind("display.timer.hide", () => {
    try {
      clearTimer();
    } catch {}
  });

  // Score updates
  bind("display.score.update", (e) => {
    try {
      const { player, opponent } = e?.detail || {};
      if (typeof player === "number" && typeof opponent === "number") {
        updateScore(player, opponent);
      }
    } catch {}
  });

  return disposeScoreboardAdapter;
}

/**
 * Remove all adapter listeners.
 *
 * @pseudocode
 * 1. Iterate through the `handlers` array.
 * 2. For each handler object, call `offBattleEvent` using its `type` and `fn` properties to remove the event listener.
 * 3. Clear the `handlers` array by setting its length to 0.
 * 4. Set the `bound` flag to `false` to indicate that the adapter is no longer active.
 */
export function disposeScoreboardAdapter() {
  for (const { type, fn } of handlers) {
    offBattleEvent(type, fn);
  }
  handlers.length = 0;
  bound = false;
}

export default initScoreboardAdapter;
