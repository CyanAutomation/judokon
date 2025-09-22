import {
  clearMessage,
  clearTimer,
  showMessage,
  updateRoundCounter,
  updateScore,
  updateTimer
} from "../setupScoreboard.js";
import { offBattleEvent, onBattleEvent } from "./battleEvents.js";
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
const listenerRegistry = new Map();

function registerListener(type, handler) {
  onBattleEvent(type, handler);
  listenerRegistry.set(type, handler);
}

function removeAllListeners() {
  listenerRegistry.forEach((handler, type) => {
    try {
      offBattleEvent(type, handler);
    } catch {}
  });
  listenerRegistry.clear();
}

function extractSeconds(detail) {
  const seconds = detail?.secondsRemaining;
  return typeof seconds === "number" && Number.isFinite(seconds) ? seconds : null;
}

function handleRoundStart(event) {
  try {
    clearMessage();
  } catch {}
  const roundNumber = event?.detail?.roundNumber;
  if (typeof roundNumber === "number" && Number.isFinite(roundNumber)) {
    try {
      updateRoundCounter(roundNumber);
    } catch {}
  }
}

function handleRoundMessage(event) {
  const { text, lock } = event?.detail || {};
  if (typeof text === "undefined" || text === null) return;
  const messageText = typeof text === "string" ? text : String(text);
  try {
    showMessage(messageText, { outcome: Boolean(lock) });
  } catch {}
}

function handleRoundOutcome(event) {
  const text = event?.detail?.text;
  if (typeof text === "undefined" || text === null) return;
  const outcomeText = typeof text === "string" ? text : String(text);
  try {
    showMessage(outcomeText, { outcome: true });
  } catch {}
}

function handleMessageClear() {
  try {
    clearMessage();
  } catch {}
}

function handleTimerShow(event) {
  const seconds = extractSeconds(event?.detail || {});
  if (seconds === null) return;
  try {
    updateTimer(seconds);
  } catch {}
}

function handleTimerTick(event) {
  const seconds = extractSeconds(event?.detail || {});
  if (seconds === null) return;
  try {
    updateTimer(seconds);
  } catch {}
}

function handleTimerHide() {
  try {
    clearTimer();
  } catch {}
}

function handleScoreUpdate(event) {
  const { player, opponent } = event?.detail || {};
  const playerIsNumber = typeof player === "number" && Number.isFinite(player);
  const opponentIsNumber = typeof opponent === "number" && Number.isFinite(opponent);
  if (!playerIsNumber || !opponentIsNumber) {
    return;
  }
  try {
    updateScore(player, opponent);
  } catch {}
}

function wireScoreboardListeners() {
  registerListener("display.round.start", handleRoundStart);
  registerListener("display.round.message", handleRoundMessage);
  registerListener("display.round.outcome", handleRoundOutcome);
  registerListener("display.message.clear", handleMessageClear);
  registerListener("display.timer.show", handleTimerShow);
  registerListener("display.timer.tick", handleTimerTick);
  registerListener("display.timer.hide", handleTimerHide);
  registerListener("display.score.update", handleScoreUpdate);
}
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
 * 2. Subscribe to battle events and forward them to scoreboard helpers.
 * 3. Wire RoundStore into scoreboard for centralized state management.
 * 4. Return a disposer that removes all listeners.
 *
 * @returns {() => void} dispose function to remove listeners
 */
export function initScoreboardAdapter() {
  if (bound) {
    return disposeScoreboardAdapter;
  }
  bound = true;

  wireScoreboardListeners();

  const roundStoreWiring = roundStore.wireIntoScoreboardAdapter();
  scoreboardReadyPromise = Promise.resolve(roundStoreWiring).then(() => {});

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
 * 1. Remove battle event listeners and RoundStore callbacks.
 * 2. Clear the bound flag and reset the ready promise.
 * @returns {void}
 */
export function disposeScoreboardAdapter() {
  removeAllListeners();
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
