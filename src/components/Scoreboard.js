import { shouldReduceMotionSync } from "../helpers/motionUtils.js";
import { t } from "../helpers/i18n.js";

/**
 * Create a battle scoreboard showing round messages, stat-selection timer,
 * round counter and score.
 *
 * @pseudocode
 * 1. Create four `<p>` elements for message, timer, round counter and score.
 * 2. Append them to the provided container.
 * 3. Return the container element.
 *
 * @param {HTMLDivElement} [container=document.createElement("div")] - Wrapper to populate.
 * @returns {HTMLDivElement} The scoreboard element.
 */
export function createScoreboard(container = document.createElement("div")) {
  const messageEl = document.createElement("p");
  messageEl.id = "round-message";
  messageEl.setAttribute("aria-live", "polite");
  messageEl.setAttribute("aria-atomic", "true");
  messageEl.setAttribute("role", "status");

  const timerEl = document.createElement("p");
  timerEl.id = "next-round-timer";
  timerEl.setAttribute("aria-live", "polite");
  timerEl.setAttribute("aria-atomic", "true");
  timerEl.setAttribute("role", "status");

  const roundCounterEl = document.createElement("p");
  roundCounterEl.id = "round-counter";
  roundCounterEl.setAttribute("aria-live", "polite");
  roundCounterEl.setAttribute("aria-atomic", "true");

  const scoreEl = document.createElement("p");
  scoreEl.id = "score-display";
  scoreEl.setAttribute("aria-live", "polite");
  scoreEl.setAttribute("aria-atomic", "true");

  container.append(messageEl, timerEl, roundCounterEl, scoreEl);
  return container;
}

/**
 * Scoreboard controller handling DOM updates and state tracking.
 */
export class Scoreboard {
  /**
   * @param {object} [deps]
   * @param {HTMLElement|null} deps.messageEl
   * @param {HTMLElement|null} deps.timerEl
   * @param {HTMLElement|null} deps.roundCounterEl
   * @param {HTMLElement|null} deps.scoreEl
   * @param {Function} [deps.startCoolDown]
   * @param {Function} [deps.pauseTimer]
   * @param {Function} [deps.resumeTimer]
   * @param {object} [deps.scheduler]
   * @pseudocode
   * 1. Store provided DOM references and controls.
   * 2. Initialize state trackers and debounce maps.
   * 3. Attach visibility and focus listeners that pause/resume timers.
   */
  constructor({
    messageEl = null,
    timerEl = null,
    roundCounterEl = null,
    scoreEl = null,
    startCoolDown,
    pauseTimer,
    resumeTimer,
    scheduler
  } = {}) {
    this.messageEl = messageEl;
    this.timerEl = timerEl;
    this.roundCounterEl = roundCounterEl;
    this.scoreEl = scoreEl;
    this.startCoolDown = startCoolDown;
    this.pauseTimer = pauseTimer;
    this.resumeTimer = resumeTimer;
    this.scheduler = scheduler;

    this.currentPlayer = 0;
    this.currentOpponent = 0;
    this.scoreRafId = null;
    this.visibilityHandler = null;
    this.focusHandler = null;
    this.announceDelayMs = 0;
    this.announceTimers = new WeakMap();
    this.outcomeLockUntil = 0;

    this.state = {
      message: { text: "", outcome: false },
      timer: { secondsRemaining: null },
      round: { current: 0 },
      score: { player: 0, opponent: 0 }
    };

    this._attachVisibilityHandlers();
  }

  _attachVisibilityHandlers() {
    const doc = typeof document !== "undefined" ? document : null;
    const win = typeof window !== "undefined" ? window : null;
    if (!doc || !win) return;
    this.visibilityHandler = () => {
      if (doc.hidden && typeof this.pauseTimer === "function") {
        this.pauseTimer();
      }
    };
    this.focusHandler = () => {
      if (!doc.hidden && typeof this.resumeTimer === "function") {
        this.resumeTimer();
      }
    };
    doc.addEventListener("visibilitychange", this.visibilityHandler);
    win.addEventListener("focus", this.focusHandler);
  }

  _setLiveText(el, text) {
    if (!el) return;
    try {
      if (this.announceDelayMs <= 0) {
        el.textContent = text;
        return;
      }
      const prev = this.announceTimers.get(el);
      if (prev) clearTimeout(prev);
      const id = setTimeout(() => {
        el.textContent = text;
        this.announceTimers.delete(el);
      }, this.announceDelayMs);
      this.announceTimers.set(el, id);
    } catch {
      try {
        el.textContent = text;
      } catch {}
    }
  }

  _setScoreText(player, opponent) {
    if (!this.scoreEl) return;
    let playerSpan = this.scoreEl.firstElementChild;
    let opponentSpan = this.scoreEl.lastElementChild;
    if (!playerSpan || !opponentSpan) {
      const doc = typeof document !== "undefined" ? document : null;
      if (!doc) return;
      playerSpan = doc.createElement("span");
      playerSpan.setAttribute("data-side", "player");
      opponentSpan = doc.createElement("span");
      opponentSpan.setAttribute("data-side", "opponent");
      this.scoreEl.append(playerSpan, doc.createTextNode("\n"), opponentSpan);
    }
    try {
      if (!playerSpan.getAttribute("data-side")) playerSpan.setAttribute("data-side", "player");
      if (!opponentSpan.getAttribute("data-side"))
        opponentSpan.setAttribute("data-side", "opponent");
    } catch {}
    try {
      const doc = typeof document !== "undefined" ? document : null;
      const sibling = playerSpan.nextSibling;
      if (doc) {
        if (!sibling || sibling.nodeType !== Node.TEXT_NODE) {
          this.scoreEl.insertBefore(doc.createTextNode("\n"), opponentSpan);
        } else if (sibling.nodeValue !== "\n") {
          sibling.nodeValue = "\n";
        }
      }
    } catch {}
    playerSpan.textContent = `You: ${player}`;
    opponentSpan.textContent = `Opponent: ${opponent}`;
  }

  _animateScore(startPlayer, startOpponent, playerTarget, opponentTarget) {
    cancelAnimationFrame(this.scoreRafId);
    if (shouldReduceMotionSync()) return;
    const startTime = performance.now();
    const duration = 500;
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const playerVal = Math.round(startPlayer + (playerTarget - startPlayer) * progress);
      const opponentVal = Math.round(startOpponent + (opponentTarget - startOpponent) * progress);
      this._setScoreText(playerVal, opponentVal);
      if (progress < 1) {
        this.scoreRafId = requestAnimationFrame(step);
      }
    };
    this.scoreRafId = requestAnimationFrame(step);
  }

  /**
   * Update the round message text.
   *
   * @pseudocode
   * 1. Ignore updates when element missing.
   * 2. Block transient placeholders if an outcome is locked.
   * 3. Update text and toggle `data-outcome` flag.
   * @param {string} text
   * @param {{ outcome?: boolean }} [opts]
   * @returns {void}
   */
  showMessage(text, opts = {}) {
    const el = this.messageEl;
    if (!el) return;
    const { outcome = false } = opts;
    try {
      const isTransient = String(text) === "Waiting…";
      if (el.dataset.outcome === "true") {
        if (Date.now() < this.outcomeLockUntil) {
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
    this._setLiveText(el, text);
    if (outcome) {
      el.dataset.outcome = "true";
      const pad = Math.max(this.announceDelayMs || 0, 200);
      this.outcomeLockUntil = Date.now() + 1000 + pad;
    } else {
      delete el.dataset.outcome;
    }
    this.state.message = { text: String(text ?? ""), outcome: !!outcome };
  }

  /**
   * Clear the round message.
   *
   * @pseudocode
   * 1. If the message element exists, clear its text and outcome flag.
   */
  clearMessage() {
    const el = this.messageEl;
    if (!el) return;
    this._setLiveText(el, "");
    delete el.dataset.outcome;
    this.outcomeLockUntil = 0;
    this.state.message = { text: "", outcome: false };
  }

  /**
   * Display a temporary message and return a function to clear it later.
   *
   * @pseudocode
   * 1. Show the message text.
   * 2. Return a closure that clears the message if unchanged.
   * @param {string} text - Message to display temporarily.
   * @returns {() => void} Function that clears the message.
   */
  showTemporaryMessage(text) {
    this.showMessage(text);
    return () => {
      if (this.messageEl && this.messageEl.textContent === text) {
        this._setLiveText(this.messageEl, "");
      }
    };
  }

  /**
   * Display a message announcing an auto-selected stat.
   *
   * @param {string} stat
   */
  showAutoSelect(stat) {
    this.showMessage(t("ui.autoSelect", { stat }));
  }

  /**
   * Update the countdown display.
   *
   * @pseudocode
   * 1. If `seconds` <= 0, clear the timer text.
   * 2. Otherwise render "Time Left: <seconds>s".
   * @param {number} seconds - Remaining seconds in the countdown.
   */
  updateTimer(seconds) {
    const el = this.timerEl;
    if (!el) return;
    if (seconds <= 0) {
      this._setLiveText(el, "");
      return;
    }
    this._setLiveText(el, `Time Left: ${seconds}s`);
    this.state.timer = { secondsRemaining: Number(seconds) };
  }

  /**
   * Clear the timer display.
   *
   * @pseudocode
   * 1. If the timer element exists, set its text content to an empty string.
   */
  clearTimer() {
    const el = this.timerEl;
    if (el) {
      this._setLiveText(el, "");
    }
  }

  /**
   * Update the round counter display.
   *
   * @pseudocode
   * 1. If the round counter element exists, render `Round <current>`.
   * @param {number} current - Current round number.
   */
  updateRoundCounter(current) {
    const el = this.roundCounterEl;
    if (el) {
      this._setLiveText(el, `Round ${current}`);
    }
  }

  /**
   * Clear the round counter display.
   *
   * @pseudocode
   * 1. If the round counter element exists, clear its text content.
   */
  clearRoundCounter() {
    const el = this.roundCounterEl;
    if (el) {
      el.textContent = "";
    }
  }

  /**
   * Display the current match score with an animated count.
   *
   * @pseudocode
   * 1. Update the score text to the final values.
   * 2. Track previous values and animate toward targets.
   * @param {number} playerScore - Player's score.
   * @param {number} opponentScore - Opponent's score.
   */
  updateScore(playerScore, opponentScore) {
    if (!this.scoreEl) return;
    this._setScoreText(playerScore, opponentScore);
    const startPlayer = this.currentPlayer;
    const startOpponent = this.currentOpponent;
    this.currentPlayer = playerScore;
    this.currentOpponent = opponentScore;
    this._animateScore(startPlayer, startOpponent, playerScore, opponentScore);
    this.state.score = { player: Number(playerScore), opponent: Number(opponentScore) };
  }

  /**
   * Render a partial state patch into the scoreboard.
   *
   * @pseudocode
   * 1. Update message if provided.
   * 2. Update or clear timer accordingly.
   * 3. Update round counter.
   * 4. Update score.
   * @param {object} patch
   */
  render(patch = {}) {
    if (!patch || typeof patch !== "object") return;
    if (Object.prototype.hasOwnProperty.call(patch, "message")) {
      const m = patch.message;
      if (m && typeof m === "object") this.showMessage(m.text ?? "", { outcome: !!m.outcome });
      else this.showMessage(String(m ?? ""));
    }
    if (Object.prototype.hasOwnProperty.call(patch, "timerSeconds")) {
      const s = patch.timerSeconds;
      if (typeof s === "number") this.updateTimer(s);
      else this.clearTimer();
    }
    if (typeof patch.roundNumber === "number") {
      this.updateRoundCounter(patch.roundNumber);
      this.state.round = { current: Number(patch.roundNumber) };
    }
    if (patch.score && typeof patch.score === "object") {
      this.updateScore(Number(patch.score.player) || 0, Number(patch.score.opponent) || 0);
    }
  }

  /**
   * Get a readonly snapshot of the current scoreboard state.
   *
   * @returns {Readonly<{message:{text:string,outcome:boolean},timer:{secondsRemaining:number|null},round:{current:number},score:{player:number,opponent:number}}>} state
   */
  getState() {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Destroy listeners and clear references.
   *
   * @pseudocode
   * 1. Remove visibility/focus listeners when attached.
   * 2. Cancel score animation frames and clear pending debounced updates.
   * 3. Null internal element references and reset lock.
   */
  destroy() {
    const doc = typeof document !== "undefined" ? document : null;
    const win = typeof window !== "undefined" ? window : null;
    try {
      if (doc && this.visibilityHandler)
        doc.removeEventListener("visibilitychange", this.visibilityHandler);
      if (win && this.focusHandler) win.removeEventListener("focus", this.focusHandler);
    } catch {}
    this.visibilityHandler = null;
    this.focusHandler = null;
    try {
      cancelAnimationFrame(this.scoreRafId);
    } catch {}
    try {
      for (const el of [this.messageEl, this.timerEl, this.roundCounterEl, this.scoreEl]) {
        const id = el ? this.announceTimers.get(el) : null;
        if (id) clearTimeout(id);
      }
    } catch {}
    this.messageEl = this.timerEl = this.roundCounterEl = this.scoreEl = null;
    this.outcomeLockUntil = 0;
  }
}

let defaultScoreboard = null;

/**
 * Initialize a default Scoreboard instance for convenience wrappers.
 *
 * @param {HTMLElement|null} container - Header element containing the scoreboard nodes.
 * @param {object} [controls={}] - Timer control callbacks.
 * @returns {void}
 */
export function initScoreboard(container, controls = {}) {
  const header = container || null;
  const messageEl = header ? header.querySelector("#round-message") : null;
  const timerEl = header ? header.querySelector("#next-round-timer") : null;
  const roundCounterEl = header ? header.querySelector("#round-counter") : null;
  const scoreEl = header ? header.querySelector("#score-display") : null;
  if (defaultScoreboard) defaultScoreboard.destroy();
  defaultScoreboard = new Scoreboard({
    messageEl,
    timerEl,
    roundCounterEl,
    scoreEl,
    startCoolDown: controls.startCoolDown,
    pauseTimer: controls.pauseTimer,
    resumeTimer: controls.resumeTimer,
    scheduler: controls.scheduler
  });
}

// Wrapper exports for existing consumers
function ensureDefault() {
  if (!defaultScoreboard) {
    const doc = typeof document !== "undefined" ? document : null;
    if (doc) {
      const header = doc.querySelector("header");
      const messageEl = doc.getElementById("round-message");
      const timerEl = doc.getElementById("next-round-timer");
      const roundCounterEl = doc.getElementById("round-counter");
      const scoreEl = doc.getElementById("score-display");
      if (messageEl || timerEl || roundCounterEl || scoreEl) {
        defaultScoreboard = new Scoreboard({ messageEl, timerEl, roundCounterEl, scoreEl });
      } else if (header) {
        initScoreboard(header);
      }
    }
  }
  return defaultScoreboard;
}

/**
 * Show a round message using the default scoreboard instance.
 *
 * @pseudocode
 * 1. Ensure a default scoreboard exists (create one if needed).
 * 2. Forward all arguments to the scoreboard `showMessage` method.
 * @param {...*} args - Arguments forwarded to `Scoreboard.showMessage`.
 * @returns {void|undefined}
 */
export const showMessage = (...args) => ensureDefault()?.showMessage(...args);

/**
 * Clear the round message on the default scoreboard.
 *
 * @pseudocode
 * 1. Ensure a default scoreboard exists.
 * 2. Call its `clearMessage` method to remove displayed text and flags.
 * @param {...*} args - Arguments forwarded to `Scoreboard.clearMessage` (if any).
 * @returns {void|undefined}
 */
export const clearMessage = (...args) => ensureDefault()?.clearMessage(...args);

/**
 * Show a temporary message and return a clear function from the default scoreboard.
 *
 * @pseudocode
 * 1. Ensure a default scoreboard exists.
 * 2. Forward invocation to `showTemporaryMessage` and return whatever it returns.
 * @param {...*} args - Arguments forwarded to `Scoreboard.showTemporaryMessage`.
 * @returns {Function|undefined} A function that clears the temporary message when called.
 */
export const showTemporaryMessage = (...args) => ensureDefault()?.showTemporaryMessage(...args);

/**
 * Announce an auto-selection message via the default scoreboard.
 *
 * @pseudocode
 * 1. Ensure a default scoreboard exists.
 * 2. Forward the provided stat string to `showAutoSelect`.
 * @param {...*} args - Arguments forwarded to `Scoreboard.showAutoSelect`.
 * @returns {void|undefined}
 */
export const showAutoSelect = (...args) => ensureDefault()?.showAutoSelect(...args);

/**
 * Update the countdown timer on the default scoreboard.
 *
 * @pseudocode
 * 1. Ensure a default scoreboard exists.
 * 2. Forward the seconds argument to `updateTimer` to refresh display.
 * @param {...*} args - Arguments forwarded to `Scoreboard.updateTimer`.
 * @returns {void|undefined}
 */
export const updateTimer = (...args) => ensureDefault()?.updateTimer(...args);

/**
 * Clear the countdown timer display on the default scoreboard.
 *
 * @pseudocode
 * 1. Ensure a default scoreboard exists.
 * 2. Call its `clearTimer` method.
 * @param {...*} args - Arguments forwarded to `Scoreboard.clearTimer` (if any).
 * @returns {void|undefined}
 */
export const clearTimer = (...args) => ensureDefault()?.clearTimer(...args);

/**
 * Update the round counter on the default scoreboard.
 *
 * @pseudocode
 * 1. Ensure a default scoreboard exists.
 * 2. Forward the current round number to `updateRoundCounter`.
 * @param {...*} args - Arguments forwarded to `Scoreboard.updateRoundCounter`.
 * @returns {void|undefined}
 */
export const updateRoundCounter = (...args) => ensureDefault()?.updateRoundCounter(...args);

/**
 * Clear the round counter display on the default scoreboard.
 *
 * @pseudocode
 * 1. Ensure a default scoreboard exists.
 * 2. Call its `clearRoundCounter` method.
 * @param {...*} args - Arguments forwarded to `Scoreboard.clearRoundCounter` (if any).
 * @returns {void|undefined}
 */
export const clearRoundCounter = (...args) => ensureDefault()?.clearRoundCounter(...args);

/**
 * Update the displayed score via the default scoreboard.
 *
 * @pseudocode
 * 1. Ensure a default scoreboard exists.
 * 2. Forward player and opponent scores to `updateScore`.
 * @param {...*} args - Arguments forwarded to `Scoreboard.updateScore` (player, opponent).
 * @returns {void|undefined}
 */
export const updateScore = (...args) => ensureDefault()?.updateScore(...args);

/**
 * Render a partial scoreboard state patch using the default scoreboard.
 *
 * @pseudocode
 * 1. Ensure a default scoreboard exists.
 * 2. Forward the patch object to `render`.
 * @param {...*} args - Arguments forwarded to `Scoreboard.render` (patch object).
 * @returns {void|undefined}
 */
export const render = (...args) => ensureDefault()?.render(...args);

/**
 * Return a readonly snapshot of the default scoreboard's state.
 *
 * @pseudocode
 * 1. Ensure a default scoreboard exists.
 * 2. Return its `getState()` result or a default empty state if not present.
 * @returns {{message:{text:string,outcome:boolean},timer:{secondsRemaining:number|null},round:{current:number},score:{player:number,opponent:number}}}
 */
export const getState = () =>
  ensureDefault()?.getState() ?? {
    message: { text: "", outcome: false },
    timer: { secondsRemaining: null },
    round: { current: 0 },
    score: { player: 0, opponent: 0 }
  };

/**
 * Destroy the default scoreboard instance and free resources.
 *
 * @pseudocode
 * 1. Call `destroy()` on the default scoreboard if it exists.
 * 2. Set the module-level `defaultScoreboard` reference to `null`.
 * @returns {void}
 */
export const destroy = () => {
  defaultScoreboard?.destroy();
  defaultScoreboard = null;
};
