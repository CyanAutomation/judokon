/**
 * Create a battle scoreboard showing round messages, round counter, countdown timer and score.
 *
 * @pseudocode
 * 1. Create four `<p>` elements:
 *    - `#round-message` with `aria-live="polite"`, `aria-atomic="true"`, and `role="status"` for result text.
 *    - `#next-round-timer` with `aria-live="polite"`, `aria-atomic="true"`, and `role="status"` for countdown updates.
 *    - `#round-counter` with `aria-live="polite"` and `aria-atomic="true"` for the round tracker.
 *    - `#score-display` with `aria-live="polite"` and `aria-atomic="true"` for the match score.
 * 2. Append them to the provided container (typically the page header).
 * 3. Store references to these elements for later updates.
 * 4. Return the container element.
 *
 * @returns {HTMLDivElement} The scoreboard element.
 */
import { shouldReduceMotionSync } from "../helpers/motionUtils.js";
import { startCoolDown } from "../helpers/battleEngineFacade.js";
import { showSnackbar, updateSnackbar } from "../helpers/showSnackbar.js";

let messageEl;
let timerEl;
let scoreEl;
let roundCounterEl;
let scoreRafId = 0;
let currentPlayer = 0;
let currentComputer = 0;

export function createScoreboard(container = document.createElement("div")) {
  messageEl = document.createElement("p");
  messageEl.id = "round-message";
  messageEl.setAttribute("aria-live", "polite");
  messageEl.setAttribute("aria-atomic", "true");
  messageEl.setAttribute("role", "status");

  timerEl = document.createElement("p");
  timerEl.id = "next-round-timer";
  timerEl.setAttribute("aria-live", "polite");
  timerEl.setAttribute("aria-atomic", "true");
  timerEl.setAttribute("role", "status");

  roundCounterEl = document.createElement("p");
  roundCounterEl.id = "round-counter";
  roundCounterEl.setAttribute("aria-live", "polite");
  roundCounterEl.setAttribute("aria-atomic", "true");

  scoreEl = document.createElement("p");
  scoreEl.id = "score-display";
  scoreEl.setAttribute("aria-live", "polite");
  // Score announcements use a polite live region; consider throttling if updates are frequent.
  scoreEl.setAttribute("aria-atomic", "true");

  container.append(messageEl, timerEl, roundCounterEl, scoreEl);
  return container;
}

/**
 * Initialize internal references using elements that already exist in the page
 * header.
 *
 * @pseudocode
 * 1. Locate child elements within `container` by their IDs.
 * 2. Store these nodes in module-scoped variables for later updates.
 *
 * @param {HTMLElement} container - Header element containing the scoreboard nodes.
 * @returns {void}
 */
export function initScoreboard(container) {
  if (!container) return;
  messageEl = container.querySelector("#round-message");
  timerEl = container.querySelector("#next-round-timer");
  roundCounterEl = container.querySelector("#round-counter");
  scoreEl = container.querySelector("#score-display");
}

// Best-effort lazy lookup for header elements in case initialization runs late
function ensureRefs() {
  if (!messageEl || !messageEl.isConnected) {
    messageEl = document.getElementById("round-message") || messageEl;
  }
  if (!timerEl || !timerEl.isConnected) {
    timerEl = document.getElementById("next-round-timer") || timerEl;
  }
  if (!roundCounterEl || !roundCounterEl.isConnected) {
    roundCounterEl = document.getElementById("round-counter") || roundCounterEl;
  }
  if (!scoreEl || !scoreEl.isConnected) {
    scoreEl = document.getElementById("score-display") || scoreEl;
  }
}

function setScoreText(player, computer) {
  if (!scoreEl) return;
  let playerSpan = scoreEl.firstElementChild;
  let opponentSpan = scoreEl.lastElementChild;
  if (!playerSpan || !opponentSpan) {
    playerSpan = document.createElement("span");
    opponentSpan = document.createElement("span");
    scoreEl.append(playerSpan, opponentSpan);
  }
  playerSpan.textContent = `You: ${player}`;
  opponentSpan.textContent = `\nOpponent: ${computer}`;
}

function animateScore(startPlayer, startComputer, playerTarget, computerTarget) {
  cancelAnimationFrame(scoreRafId);
  if (shouldReduceMotionSync()) return;
  const startTime = performance.now();
  const duration = 500;
  const step = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const playerVal = Math.round(startPlayer + (playerTarget - startPlayer) * progress);
    const computerVal = Math.round(startComputer + (computerTarget - startComputer) * progress);
    setScoreText(playerVal, computerVal);
    if (progress < 1) {
      scoreRafId = requestAnimationFrame(step);
    }
  };
  scoreRafId = requestAnimationFrame(step);
}

/**
 * Update the round message text.
 *
 * @pseudocode
 * 1. When a message element exists, set its text content to the provided value.
 *
 * @param {string} text - Message to display.
 * @returns {void}
 */
export function showMessage(text) {
  // Prefer a fresh lookup to avoid stale references in dynamic tests
  const el = document.getElementById("round-message") || messageEl;
  if (el) {
    el.textContent = text;
    messageEl = el;
  }
}

/**
 * Clear the round message.
 *
 * @pseudocode
 * 1. If the message element exists, set its text content to an empty string.
 *
 * @returns {void}
 */
export function clearMessage() {
  const el = document.getElementById("round-message") || messageEl;
  if (el) {
    el.textContent = "";
    messageEl = el;
  }
}

/**
 * Display a temporary message and return a function to clear it later.
 *
 * @pseudocode
 * 1. Call `showMessage(text)` to update the round message.
 * 2. Return `clearMessage` so callers can remove the message when finished.
 *
 * @param {string} text - Message to display temporarily.
 * @returns {() => void} Function that clears the message.
 */
export function showTemporaryMessage(text) {
  showMessage(text);
  // Return a closure that only clears the message if it matches the one set by this call
  return function () {
    if (messageEl && messageEl.textContent === text) {
      messageEl.textContent = "";
    }
  };
}

/**
 * Display a message announcing an auto-selected stat.
 *
 * @pseudocode
 * 1. Call `showMessage` with `"Time's up! Auto-selecting <stat>"`.
 *
 * @param {string} stat - Label of the auto-selected stat.
 * @returns {void}
 */
export function showAutoSelect(stat) {
  showMessage(`Time's up! Auto-selecting ${stat}`);
}

/**
 * Clear the countdown display.
 *
 * @pseudocode
 * 1. If the timer element exists, set its text content to an empty string.
 */
export function clearTimer() {
  ensureRefs();
  if (timerEl) {
    timerEl.textContent = "";
  }
}

/**
 * Update the round counter display.
 *
 * @pseudocode
 * 1. When the round counter element exists, set its text content to
 *    `"Round <current>"`.
 *
 * @param {number} current - Current round number.
 * @returns {void}
 */
export function updateRoundCounter(current) {
  ensureRefs();
  if (roundCounterEl) {
    roundCounterEl.textContent = `Round ${current}`;
  }
}

/**
 * Clear the round counter display.
 *
 * @pseudocode
 * 1. If the round counter element exists, set its text content to an empty
 *    string.
 *
 * @returns {void}
 */
export function clearRoundCounter() {
  ensureRefs();
  if (roundCounterEl) {
    roundCounterEl.textContent = "";
  }
}

/**
 * Start a countdown timer that monitors for drift and displays a fallback when
 * desynchronization occurs.
 *
 * @pseudocode
 * 1. Create a countdown `state` object.
 * 2. Build pure helpers for tick rendering, expiration handling, and drift restarts.
 * 3. Kick off the countdown with `runCountdown` and monitor for drift.
 *
 * @param {number} seconds - Seconds to count down from.
 * @param {Function} [onFinish] - Optional callback when countdown ends.
 * @returns {void}
 */
export function startCountdown(seconds, onFinish) {
  clearTimer();
  if (seconds <= 0) {
    if (typeof onFinish === "function") onFinish();
    return;
  }

  const state = createCountdownState();
  const onTick = createTickRenderer(state);
  const onExpired = createExpirationHandler(onFinish);
  const restart = (rem) => runCountdown(rem, onTick, onExpired, state.handleDrift);
  state.handleDrift = createDriftHandler(restart, onExpired);

  runCountdown(seconds, onTick, onExpired, state.handleDrift);
}

/**
 * Display the current match score with an animated count.
 *
 * @pseudocode
 * 1. Update the score text to the final values.
 * 2. Store the previous score values.
 * 3. Update internal trackers to the new scores so they remain correct if
 *    animation frames are skipped.
 * 4. When motion isn't reduced, animate from the previous values toward the
 *    targets using `requestAnimationFrame`.
 *
 * @param {number} playerScore - Player's score.
 * @param {number} computerScore - Opponent's score.
 * @returns {void}
 */
export function updateScore(playerScore, computerScore) {
  ensureRefs();
  if (!scoreEl) return;
  setScoreText(playerScore, computerScore);
  const startPlayer = currentPlayer;
  const startComputer = currentComputer;
  currentPlayer = playerScore;
  currentComputer = computerScore;
  animateScore(startPlayer, startComputer, playerScore, computerScore);
}

function runCountdown(duration, onTick, onExpired, handleDrift) {
  startCoolDown(onTick, onExpired, duration, handleDrift);
}

function createDriftHandler(restartFn, onGiveUp) {
  const MAX_DRIFT_RETRIES = 3;
  let retries = 0;
  return (remaining) => {
    retries += 1;
    if (retries > MAX_DRIFT_RETRIES) {
      onGiveUp();
      return;
    }
    showMessage("Waiting…");
    restartFn(remaining);
  };
}

function createCountdownState() {
  return { started: false, handleDrift: undefined };
}

function createTickRenderer(state) {
  return (remaining) => {
    if (remaining <= 0) {
      clearTimer();
      return;
    }
    const text = `Next round in: ${remaining}s`;
    if (!state.started) {
      showSnackbar(text);
      state.started = true;
    } else {
      updateSnackbar(text);
    }
  };
}

function createExpirationHandler(onFinish) {
  return () => {
    clearTimer();
    if (typeof onFinish === "function") onFinish();
  };
}
