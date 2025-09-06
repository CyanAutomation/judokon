import { shouldReduceMotionSync } from "../helpers/motionUtils.js";
import { t } from "../helpers/i18n.js";

let messageEl,
  timerEl,
  roundCounterEl,
  scoreEl,
  startCoolDown,
  pauseTimer,
  resumeTimer,
  scheduler,
  visibilityHandler,
  focusHandler,
  scoreRafId,
  currentPlayer = 0,
  currentOpponent = 0;

// Debounce window for aria-live updates to reduce announcement chatter.
let announceDelayMs = 200;
const announceTimers = new WeakMap();
let outcomeLockUntil = 0;

function setLiveText(el, text) {
  if (!el) return;
  try {
    if (announceDelayMs <= 0) {
      el.textContent = text;
      return;
    }
    const prev = announceTimers.get(el);
    if (prev) clearTimeout(prev);
    const id = setTimeout(() => {
      el.textContent = text;
      announceTimers.delete(el);
    }, announceDelayMs);
    announceTimers.set(el, id);
  } catch {
    try {
      el.textContent = text;
    } catch {}
  }
}

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
/**
 * @summary Creates a battle scoreboard.
 * @description Creates and configures the DOM elements for the battle scoreboard, including the round message, timer, round counter, and score display.
 * @param {HTMLDivElement} [container=document.createElement("div")] - The container element to which the scoreboard will be appended.
 * @returns {HTMLDivElement} The container element with the scoreboard appended.
 * @pseudocode
 * 1. Create a `<p>` element for the round message with appropriate ARIA attributes.
 * 2. Create a `<p>` element for the timer with appropriate ARIA attributes.
 * 3. Create a `<p>` element for the round counter with appropriate ARIA attributes.
 * 4. Create a `<p>` element for the score display with appropriate ARIA attributes.
 * 5. Append all created elements to the container.
 * 6. Return the container.
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
  const doc = typeof document !== "undefined" ? document : null;
  const win = typeof window !== "undefined" ? window : null;

  if (container && doc) {
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

  if (doc && visibilityHandler) {
    doc.removeEventListener("visibilitychange", visibilityHandler);
  }
  if (win && focusHandler) {
    win.removeEventListener("focus", focusHandler);
  }

  if (!doc || !win) return;

  visibilityHandler = () => {
    if (doc.hidden && typeof pauseTimer === "function") {
      pauseTimer();
    }
  };

  focusHandler = () => {
    if (!doc.hidden && typeof resumeTimer === "function") {
      resumeTimer();
    }
  };

  doc.addEventListener("visibilitychange", visibilityHandler);
  win.addEventListener("focus", focusHandler);
}

// Best-effort lazy lookup for header elements in case initialization runs late
function ensureRefs() {
  if (typeof document === "undefined") return;
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
    const doc = typeof document !== "undefined" ? document : null;
    if (!doc) return;
    playerSpan = doc.createElement("span");
    playerSpan.setAttribute("data-side", "player");
    opponentSpan = doc.createElement("span");
    opponentSpan.setAttribute("data-side", "opponent");
    scoreEl.append(playerSpan, opponentSpan);
  }
  try {
    if (!playerSpan.getAttribute("data-side")) playerSpan.setAttribute("data-side", "player");
    if (!opponentSpan.getAttribute("data-side"))
      opponentSpan.setAttribute("data-side", "opponent");
  } catch {}
  playerSpan.textContent = `You: ${player}`;
  opponentSpan.textContent = `Opponent: ${opponent}`;
}

// Lightweight headless state snapshot for tests/CLI
const __state = {
  message: { text: "", outcome: false },
  timer: { secondsRemaining: null },
  round: { current: 0 },
  score: { player: 0, opponent: 0 }
};

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
  const doc = typeof document !== "undefined" ? document : null;
  if (!doc) return;
  const { outcome = false } = opts;
  // Prefer a fresh lookup to avoid stale references in dynamic tests
  const el = doc.getElementById("round-message") || messageEl;
  if (el) {
    try {
      const isTransient = String(text) === "Waiting…";
      // Block overwrites of an outcome message within the minimum persistence window
      if (el.dataset.outcome === "true") {
        if (Date.now() < outcomeLockUntil) {
          return;
        }
        if (isTransient) {
          return;
        }
      }
      if (isTransient && el.dataset.outcome === "true") {
        return;
      }
    } catch {}
    setLiveText(el, text);
    if (outcome) {
      el.dataset.outcome = "true";
      outcomeLockUntil = Date.now() + 1000;
    } else {
      delete el.dataset.outcome;
    }
    messageEl = el;
    __state.message = { text: String(text ?? ""), outcome: !!outcome };
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
  const doc = typeof document !== "undefined" ? document : null;
  if (!doc) return;
  const el = doc.getElementById("round-message") || messageEl;
  if (el) {
    setLiveText(el, "");
    delete el.dataset.outcome;
    messageEl = el;
    outcomeLockUntil = 0;
    __state.message = { text: "", outcome: false };
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
      setLiveText(messageEl, "");
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
    setLiveText(timerEl, "");
    return;
  }
  setLiveText(timerEl, `Time Left: ${seconds}s`);
  __state.timer = { secondsRemaining: Number(seconds) };
}

/**
 * @summary Clears the timer display.
 * @description Clears the text content of the timer element.
 * @returns {void}
 * @pseudocode
 * 1. Ensure a reference to the timer element exists.
 * 2. If the timer element exists, set its text content to an empty string.
 */
export function clearTimer() {
  ensureRefs();
  if (timerEl) {
    setLiveText(timerEl, "");
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
    setLiveText(roundCounterEl, `Round ${current}`);
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
  __state.score = { player: Number(playerScore), opponent: Number(opponentScore) };
}

/**
 * Render a partial state patch into the scoreboard.
 *
 * @pseudocode
 * 1. If `patch.message` is provided, call `showMessage` with outcome.
 * 2. If `patch.timerSeconds` is a number, update/clear timer accordingly.
 * 3. If `patch.roundNumber` is a number, update round counter.
 * 4. If `patch.score` is provided, call `updateScore` with player/opponent.
 *
 * @param {{
 *   message?: string|{text:string,outcome?:boolean},
 *   timerSeconds?: number|null,
 *   roundNumber?: number,
 *   score?: {player:number, opponent:number}
 * }} patch
 */
export function render(patch = {}) {
  if (!patch || typeof patch !== "object") return;
  if (Object.prototype.hasOwnProperty.call(patch, "message")) {
    const m = patch.message;
    if (m && typeof m === "object") showMessage(m.text ?? "", { outcome: !!m.outcome });
    else showMessage(String(m ?? ""));
  }
  if (Object.prototype.hasOwnProperty.call(patch, "timerSeconds")) {
    const s = patch.timerSeconds;
    if (typeof s === "number") updateTimer(s);
    else clearTimer();
  }
  if (typeof patch.roundNumber === "number") {
    updateRoundCounter(patch.roundNumber);
    __state.round = { current: Number(patch.roundNumber) };
  }
  if (patch.score && typeof patch.score === "object") {
    updateScore(Number(patch.score.player) || 0, Number(patch.score.opponent) || 0);
  }
}

/**
 * Get a readonly snapshot of the current scoreboard state.
 *
 * @returns {Readonly<{message:{text:string,outcome:boolean},timer:{secondsRemaining:number|null},round:{current:number},score:{player:number,opponent:number}}>} state
 */
export function getState() {
  return JSON.parse(JSON.stringify(__state));
}

/**
 * Destroy listeners and clear references for test/CLI disposals.
 *
 * @pseudocode
 * 1. Remove visibility/focus listeners when attached.
 * 2. Cancel score animation frames and clear pending debounced updates.
 * 3. Null internal element references and reset lock.
 */
export function destroy() {
  const doc = typeof document !== "undefined" ? document : null;
  const win = typeof window !== "undefined" ? window : null;
  try {
    if (doc && visibilityHandler) doc.removeEventListener("visibilitychange", visibilityHandler);
    if (win && focusHandler) win.removeEventListener("focus", focusHandler);
  } catch {}
  visibilityHandler = null;
  focusHandler = null;
  try {
    cancelAnimationFrame(scoreRafId);
  } catch {}
  // Clear pending debounced updates for known elements
  try {
    for (const el of [messageEl, timerEl, roundCounterEl, scoreEl]) {
      const id = el ? announceTimers.get(el) : null;
      if (id) clearTimeout(id);
    }
  } catch {}
  messageEl = timerEl = roundCounterEl = scoreEl = null;
  outcomeLockUntil = 0;
}
