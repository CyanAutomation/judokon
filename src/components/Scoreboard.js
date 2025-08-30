/**
 * Create a battle scoreboard showing round messages, stat-selection timer, round counter and score.
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
 * @param {HTMLDivElement} [container=document.createElement("div")] - Wrapper to populate.
 * @returns {HTMLDivElement} The scoreboard element.
 */
import { shouldReduceMotionSync } from "../helpers/motionUtils.js";
import { t } from "../helpers/i18n.js";

let messageEl;
let timerEl;
let scoreEl;
let roundCounterEl;
let scoreRafId = 0;
let currentPlayer = 0;
let currentOpponent = 0;
let startCoolDown;
let pauseTimer;
let resumeTimer;
let scheduler;
let visibilityHandler;
let focusHandler;
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
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
 * Initialize internal references and store timer controls.
 *
 * @pseudocode
 * 1. Locate child elements within `container` by their IDs when provided.
 * 2. Store these nodes in module-scoped variables for later updates.
 * 3. Persist `startCoolDown`, `pauseTimer`, `resumeTimer`, and `scheduler` from
 *    `controls` for visibility-based countdown pausing.
 * 4. Attach `visibilitychange` and `focus` listeners that call the stored
 *    pause/resume callbacks.
 *
 * @param {HTMLElement|null} container - Header element containing the
 * scoreboard nodes.
 * @param {{
 *   startCoolDown?: Function,
 *   pauseTimer?: Function,
 *   resumeTimer?: Function,
 *   scheduler?: object
 * }} [controls={}] - Timer control callbacks.
 * @returns {void}
 */
export function initScoreboard(container, controls = {}) {
  if (container) {
    messageEl = container.querySelector("#round-message");
    timerEl = container.querySelector("#next-round-timer");
    roundCounterEl = container.querySelector("#round-counter");
    scoreEl = container.querySelector("#score-display");
  }

  startCoolDown = controls.startCoolDown;
  pauseTimer = controls.pauseTimer;
  resumeTimer = controls.resumeTimer;
  scheduler = controls.scheduler;

  // Mark currently unused controls to satisfy lint while retaining references.
  void startCoolDown;
  void scheduler;

  if (visibilityHandler) {
    document.removeEventListener("visibilitychange", visibilityHandler);
  }
  if (focusHandler) {
    window.removeEventListener("focus", focusHandler);
  }

  visibilityHandler = () => {
    if (document.hidden && typeof pauseTimer === "function") {
      pauseTimer();
    }
  };

  focusHandler = () => {
    if (!document.hidden && typeof resumeTimer === "function") {
      resumeTimer();
    }
  };

  document.addEventListener("visibilitychange", visibilityHandler);
  window.addEventListener("focus", focusHandler);
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

function setScoreText(player, opponent) {
  if (!scoreEl) return;
  let playerSpan = scoreEl.firstElementChild;
  let opponentSpan = scoreEl.lastElementChild;
  if (!playerSpan || !opponentSpan) {
    playerSpan = document.createElement("span");
    opponentSpan = document.createElement("span");
    scoreEl.append(playerSpan, opponentSpan);
  }
  playerSpan.textContent = `You: ${player}`;
  opponentSpan.textContent = `\nOpponent: ${opponent}`;
}

function animateScore(startPlayer, startOpponent, playerTarget, opponentTarget) {
  cancelAnimationFrame(scoreRafId);
  if (shouldReduceMotionSync()) return;
  const startTime = performance.now();
  const duration = 500;
  const step = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const playerVal = Math.round(startPlayer + (playerTarget - startPlayer) * progress);
    const opponentVal = Math.round(startOpponent + (opponentTarget - startOpponent) * progress);
    setScoreText(playerVal, opponentVal);
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
 * 1. When a message element exists, skip overwriting round outcomes with
 *    transient placeholders.
 * 2. Update the element text content and toggle the `data-outcome` flag based
 *    on `isOutcome`.
 *
 * @param {string} text - Message to display.
 * @param {{ outcome?: boolean }} [opts] - Options controlling update behavior.
 * @returns {void}
 */
export function showMessage(text, opts = {}) {
  const { outcome = false } = opts;
  // Prefer a fresh lookup to avoid stale references in dynamic tests
  const el = document.getElementById("round-message") || messageEl;
  if (el) {
    try {
      const isTransient = String(text) === "Waiting…";
      if (isTransient && el.dataset.outcome === "true") {
        return;
      }
    } catch {}
    el.textContent = text;
    if (outcome) {
      el.dataset.outcome = "true";
    } else {
      delete el.dataset.outcome;
    }
    messageEl = el;
  }
}

/**
 * Clear the round message.
 *
 * @pseudocode
 * 1. If the message element exists, set its text content to an empty string and
 *    remove the `data-outcome` flag.
 *
 * @returns {void}
 */
export function clearMessage() {
  const el = document.getElementById("round-message") || messageEl;
  if (el) {
    el.textContent = "";
    delete el.dataset.outcome;
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
  showMessage(t("ui.autoSelect", { stat }));
}

/**
 * Update the countdown display.
 *
 * @pseudocode
 * 1. Ensure the timer element reference is available.
 * 2. If `seconds` is less than or equal to 0, clear the timer text.
 * 3. Otherwise, render `"Time Left: <seconds>s"` inside the timer element.
 *
 * @param {number} seconds - Remaining seconds in the countdown.
 * @returns {void}
 */
export function updateTimer(seconds) {
  ensureRefs();
  if (!timerEl) return;
  if (seconds <= 0) {
    timerEl.textContent = "";
    return;
  }
  timerEl.textContent = `Time Left: ${seconds}s`;
}

/**
 * Clear the countdown display.
 *
 * @pseudocode
 * 1. If the timer element exists, set its text content to an empty string.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
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
 * @param {number} opponentScore - Opponent's score.
 * @returns {void}
 */
export function updateScore(playerScore, opponentScore) {
  ensureRefs();
  if (!scoreEl) return;
  setScoreText(playerScore, opponentScore);
  const startPlayer = currentPlayer;
  const startOpponent = currentOpponent;
  currentPlayer = playerScore;
  currentOpponent = opponentScore;
  animateScore(startPlayer, startOpponent, playerScore, opponentScore);
}
