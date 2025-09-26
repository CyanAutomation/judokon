import {
  showMessage,
  clearMessage,
  showTemporaryMessage,
  clearTimer,
  updateTimer,
  showAutoSelect,
  clearRoundCounter,
  updateScore
} from "../setupScoreboard.js";
import { onBattleEvent, offBattleEvent } from "./battleEvents.js";
import { roundStore } from "./roundStore.js";

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
    } catch (error) {
      if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
        console.warn(
          `[classicBattle][scoreboardAdapter] Failed to remove listener for ${type}`,
          error
        );
      }
    }
  });
  listenerRegistry.clear();
}

/**
 * Extract the timer seconds from a battle event detail payload.
 *
 * @param {{ secondsRemaining?: number } | undefined} detail event payload detail
 * @returns {number | null} seconds remaining when valid, otherwise null
 */
function extractSeconds(detail) {
  const seconds = detail?.secondsRemaining;
  return typeof seconds === "number" && Number.isFinite(seconds) ? seconds : null;
}

function parseRoundNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function handleRoundStart(event) {
  try {
    clearMessage();
  } catch {}
  const detail = event?.detail || {};
  const roundNumber = parseRoundNumber(detail.roundNumber);
  const roundIndex = parseRoundNumber(detail.roundIndex);
  const normalizedRoundNumber = roundNumber ?? roundIndex;
  if (typeof normalizedRoundNumber === "number") {
    roundStore.setRoundNumber(normalizedRoundNumber, { emitLegacyEvent: false });
  } else {
    try {
      clearRoundCounter();
    } catch {}
  }
}

function handleRoundMessage(event) {
  const { text, lock } = event?.detail || {};
  if (typeof text === "undefined" || text === null) return;
  const messageText = typeof text === "string" ? text : String(text);
  try {
    if (messageText.length > 0) {
      showMessage(messageText, { outcome: Boolean(lock) });
    } else {
      clearMessage();
    }
  } catch {}
}

function handleRoundOutcome(event) {
  const text = event?.detail?.text;
  if (typeof text === "undefined" || text === null) return;
  const outcomeText = typeof text === "string" ? text : String(text);
  try {
    showMessage(outcomeText.length > 0 ? outcomeText : "", { outcome: true });
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

function handleAutoSelectShow(event) {
  const stat = event?.detail?.stat;
  if (typeof stat !== "string" || stat.length === 0) return;
  try {
    showAutoSelect(stat);
  } catch {}
}

function handleTempMessage(event) {
  const text = event?.detail?.text;
  if (typeof text !== "string") return;
  try {
    showTemporaryMessage(text);
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
  registerListener("display.autoSelect.show", handleAutoSelectShow);
  registerListener("display.tempMessage", handleTempMessage);
}

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

  scoreboardReadyPromise = roundStore.wireIntoScoreboardAdapter(
    updateRoundCounter,
    clearRoundCounter
  );

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

  bound = false;
  scoreboardReadyPromise = Promise.resolve();
}

export default initScoreboardAdapter;
