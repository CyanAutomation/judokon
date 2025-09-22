import { onBattleEvent, offBattleEvent } from "./battleEvents.js";
import {
  showMessage,
  clearMessage,
  updateTimer,
  clearTimer,
  updateScore,
  updateRoundCounter
} from "../setupScoreboard.js";
import { roundStore } from "./roundStore.js";
import { isEnabled } from "../featureFlags.js";

let bound = false;
const handlers = [];
let scoreboardReadyPromise = Promise.resolve();

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

function bind(type, fn) {
  handlers.push({ type, fn });
  onBattleEvent(type, fn);
}

/**
 * Initialize the Scoreboard event adapter.
 *
 * @pseudocode
 * 1. Guard against double-binding.
 * 2. Check if RoundStore feature flag is enabled.
 * 3. If enabled, wire RoundStore into scoreboard and skip legacy event binding.
 * 4. Otherwise, subscribe to PRD display.* events and map them to Scoreboard API calls.
 * 5. Return a disposer that removes all listeners.
 *
 * @returns {() => void} dispose function to remove listeners
 */
export function initScoreboardAdapter() {
  if (bound) {
    return disposeScoreboardAdapter;
  }
  bound = true;

  scoreboardReadyPromise = Promise.resolve();

  // Check if RoundStore feature flag is enabled
  const useRoundStore = isEnabled("roundStore");

  if (useRoundStore) {
    // Use RoundStore for round number updates instead of events
    scoreboardReadyPromise = Promise.resolve(roundStore.wireIntoScoreboardAdapter());
  } else {
    // Legacy event-driven approach
    // Round lifecycle
    bind("display.round.start", (e) => {
      try {
        clearMessage();
        const n = e?.detail?.roundNumber;
        if (typeof n === "number") updateRoundCounter(n);
      } catch {}
    });
  }
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
 * 1. Check if RoundStore was used for integration.
 * 2. If RoundStore was used, reset its scoreboard-related callbacks.
 * 3. Otherwise, iterate through the `handlers` array and remove legacy event listeners.
 * 4. Clear the `handlers` array and reset the `bound` flag.
 * @returns {void}
 */
export function disposeScoreboardAdapter() {
  // Clean up RoundStore integration if it was used
  try {
    roundStore.disconnectFromScoreboardAdapter();
  } catch {}

  // Remove legacy event listeners
  for (const { type, fn } of handlers) {
    offBattleEvent(type, fn);
  }
  handlers.length = 0;
  bound = false;
  scoreboardReadyPromise = Promise.resolve();
}

export default initScoreboardAdapter;
