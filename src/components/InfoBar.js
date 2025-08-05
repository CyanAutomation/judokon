/**
 * Create a battle info bar showing round messages, countdown timer and score.
 *
 * @pseudocode
 * 1. Create three `<p>` elements:
 *    - `#round-message` with `aria-live="polite"`, `aria-atomic="true"`, and `role="status"` for result text.
 *    - `#next-round-timer` with `aria-live="polite"`, `aria-atomic="true"`, and `role="status"` for countdown updates.
 *    - `#score-display` with `aria-live="polite"` and `aria-atomic="true"` for the match score.
 * 2. Append them to the provided container (typically the page header).
 * 3. Store references to these elements for later updates.
 * 4. Return the container element.
 *
 * @returns {HTMLDivElement} The info bar element.
 */
import { shouldReduceMotionSync } from "../helpers/motionUtils.js";

let messageEl;
let timerEl;
let scoreEl;
let countdownRafId = 0;
let scoreRafId = 0;
let currentPlayer = 0;
let currentComputer = 0;

export function createInfoBar(container = document.createElement("div")) {
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

  scoreEl = document.createElement("p");
  scoreEl.id = "score-display";
  scoreEl.setAttribute("aria-live", "polite");
  // Score announcements use a polite live region; consider throttling if updates are frequent.
  scoreEl.setAttribute("aria-atomic", "true");

  container.append(messageEl, timerEl, scoreEl);
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
 * @param {HTMLElement} container - Header element containing the info nodes.
 * @returns {void}
 */
export function initInfoBar(container) {
  if (!container) return;
  messageEl = container.querySelector("#round-message");
  timerEl = container.querySelector("#next-round-timer");
  scoreEl = container.querySelector("#score-display");
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

function animateScore(playerTarget, computerTarget) {
  cancelAnimationFrame(scoreRafId);
  const startPlayer = currentPlayer;
  const startComputer = currentComputer;
  if (shouldReduceMotionSync()) {
    currentPlayer = playerTarget;
    currentComputer = computerTarget;
    setScoreText(playerTarget, computerTarget);
    return;
  }
  const startTime = performance.now();
  const duration = 500;
  const step = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const playerVal = Math.round(startPlayer + (playerTarget - startPlayer) * progress);
    const computerVal = Math.round(startComputer + (computerTarget - startComputer) * progress);
    setScoreText(playerVal, computerVal);
    if (progress < 1) {
      scoreRafId = requestAnimationFrame(step);
    } else {
      currentPlayer = playerTarget;
      currentComputer = computerTarget;
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
  if (messageEl) {
    messageEl.textContent = text;
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
  if (messageEl) {
    messageEl.textContent = "";
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
 * Start a countdown timer that updates once per second using `requestAnimationFrame`.
 *
 * @pseudocode
 * 1. Cancel any existing animation frame loop.
 * 2. Store `startTime` using `performance.now()` and show the initial text.
 * 3. On each frame, compute elapsed seconds with a small frame buffer and only
 *    update when the displayed value changes.
 * 4. When no time remains, cancel the loop, show "Next round in: 0s" and run
 *    `onFinish`.
 *
 * @param {number} seconds - Seconds to count down from.
 * @param {Function} [onFinish] - Optional callback when countdown ends.
 * @returns {void}
 */
export function startCountdown(seconds, onFinish) {
  if (!timerEl) return;
  cancelAnimationFrame(countdownRafId);
  const startTime = performance.now();
  timerEl.textContent = `Next round in: ${seconds}s`;
  const frameBuffer = 1000 / 60; // ~16 ms
  let lastDisplayed = seconds;
  const step = () => {
    const elapsed = Math.floor((performance.now() - startTime + frameBuffer) / 1000);
    const remaining = Math.max(0, seconds - elapsed);
    if (remaining !== lastDisplayed) {
      lastDisplayed = remaining;
      timerEl.textContent = `Next round in: ${remaining}s`;
    }
    if (remaining <= 0) {
      cancelAnimationFrame(countdownRafId);
      if (typeof onFinish === "function") onFinish();
      return;
    }
    countdownRafId = requestAnimationFrame(step);
  };
  countdownRafId = requestAnimationFrame(step);
}

/**
 * Display the current match score with an animated count.
 *
 * @pseudocode
 * 1. Capture starting values for player and computer scores.
 * 2. When motion isn't reduced, increment both values toward targets using
 *    `requestAnimationFrame`.
 * 3. Otherwise, update text immediately.
 *
 * @param {number} playerScore - Player's score.
 * @param {number} computerScore - Opponent's score.
 * @returns {void}
 */
export function updateScore(playerScore, computerScore) {
  if (!scoreEl) return;
  animateScore(playerScore, computerScore);
}
