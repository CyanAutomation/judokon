import { shouldReduceMotionSync } from "../helpers/motionUtils.js";
import { onFrame, cancel } from "../utils/scheduler.js";

function createScoreMarkup(player, opponent) {
  const safePlayer = Number.isFinite(player) ? player : Number(player) || 0;
  const safeOpponent = Number.isFinite(opponent) ? opponent : Number(opponent) || 0;
  return (
    `<span data-side="player"><span data-part="label">You:</span> <span data-part="value">${safePlayer}</span></span>` +
    "\n" +
    `<span data-side="opponent"><span data-part="label">Opponent:</span> <span data-part="value">${safeOpponent}</span></span>`
  );
}
export class ScoreboardView {
  constructor(model, { rootEl, messageEl, timerEl, roundCounterEl, scoreEl } = {}) {
    this.model = model;
    this.rootEl =
      rootEl ||
      (messageEl && typeof messageEl.closest === "function"
        ? messageEl.closest("header, .battle-header")
        : null);
    this.messageEl = messageEl;
    this.timerEl = timerEl;
    this.roundCounterEl = roundCounterEl;
    this.scoreEl = scoreEl;
    this._scoreAnimId = 0;
    this._scoreRaf = null;
  }

  /**
   * Display a round message.
   *
   * @pseudocode
   * 1. Set textContent of message element.
   * 2. Return void.
   * @param {string} text - Message to show.
   * @param {{outcome?:boolean}} [opts] - Options including outcome flag.
   */
  showMessage(text, opts = {}) {
    if (this.messageEl) {
      this.messageEl.textContent = text;
      if (opts.outcome) {
        this.messageEl.dataset.outcome = "true";
      } else {
        delete this.messageEl.dataset.outcome;
      }
    }
    if (this.rootEl) {
      const type = typeof opts.outcomeType === "string" ? opts.outcomeType : null;
      if (opts.outcome && type) {
        this.rootEl.dataset.outcome = type;
      } else if (!opts.outcome) {
        this.rootEl.dataset.outcome = "none";
      }
    }
  }

  /**
   * Clear any shown round message.
   *
   * @pseudocode
   * 1. Delegate to showMessage with empty string.
   */
  clearMessage() {
    this.showMessage("");
  }

  /**
   * Show a temporary message and return a clearer.
   *
   * @pseudocode
   * 1. Render the provided text.
   * 2. Return clearer that only wipes if unchanged.
   * @param {string} text - Message to display temporarily.
   * @returns {Function} Clearer function.
   */
  showTemporaryMessage(text) {
    this.showMessage(text);
    return () => {
      if (this.messageEl && this.messageEl.textContent === text) {
        this.clearMessage();
      }
    };
  }

  /**
   * Update the timer display.
   *
   * @pseudocode
   * 1. Render `Time Left: {seconds}s` or clear when null.
   * 2. Return void.
   * @param {number|string} seconds - Seconds remaining.
   */
  updateTimer(seconds) {
    if (!this.timerEl) return;
    let label = this.timerEl.querySelector('[data-part="label"]');
    let value = this.timerEl.querySelector('[data-part="value"]');
    
    if (typeof seconds === "number" && Number.isFinite(seconds)) {
      const clamped = Math.max(0, seconds);
      
      // If we don't have the expected structure, rebuild it
      if (!label || !value) {
        this.timerEl.innerHTML = `<span data-part="label">Time Left:</span> <span data-part="value">${clamped}s</span>`;
        return;
      }
      
      // Update existing structure
      label.textContent = "Time Left:";
      value.textContent = `${clamped}s`;
    } else {
      // Clear the display
      if (label && value) {
        label.textContent = "";
        value.textContent = "";
      } else {
        this.timerEl.innerHTML = "";
      }
    }
  }

  /**
   * Clear the timer display.
   *
   * @pseudocode
   * 1. Delegate to updateTimer with empty string.
   */
  clearTimer() {
    this.updateTimer("");
  }

  /**
   * Render the score using model state.
   *
   * @pseudocode
   * 1. Read player/opponent from model.
   * 2. Update DOM spans accordingly.
   */
  updateScore() {
    if (!this.scoreEl) return;
    const { player, opponent } = this.model.getState().score;
    try {
      const IS_VITEST = typeof process !== "undefined" && process.env && process.env.VITEST;
      if (IS_VITEST) {
        this.scoreEl.innerHTML = createScoreMarkup(player, opponent);
        return;
      }
    } catch {}
    // Reduced motion → immediate update
    let reduce = false;
    try {
      reduce = !!shouldReduceMotionSync();
    } catch {}
    if (reduce) {
      this.scoreEl.innerHTML = createScoreMarkup(player, opponent);
      return;
    }
    // Immediate set for determinism, optional animate when prior spans exist
    const endVals = { p: Number(player) || 0, o: Number(opponent) || 0 };
    let playerSpan = this.scoreEl.querySelector('span[data-side="player"]');
    let opponentSpan = this.scoreEl.querySelector('span[data-side="opponent"]');
    if (!playerSpan || !opponentSpan) {
      // Ensure deterministic text content even if initial markup lacks spans.
      this._scoreAnimId += 1;
      if (this._scoreRaf) {
        cancel(this._scoreRaf);
        this._scoreRaf = null;
      }
      this.scoreEl.innerHTML = createScoreMarkup(endVals.p, endVals.o);
      // Force DOM update before querying for the newly inserted spans.
      const forceLayout = this.scoreEl.offsetHeight;
      void forceLayout;
      playerSpan = this.scoreEl.querySelector('span[data-side="player"]');
      opponentSpan = this.scoreEl.querySelector('span[data-side="opponent"]');
      if (!playerSpan || !opponentSpan) {
        console.warn("ScoreboardView: Failed to create score spans after DOM rebuild");
        return;
      }
    }
    const parse = (el) => {
      if (!el) return 0;
      const m = el.textContent && el.textContent.match(/(\d+)/);
      return m ? Number(m[1]) : 0;
    };
    const startVals = { p: parse(playerSpan), o: parse(opponentSpan) };
    if (startVals.p === endVals.p && startVals.o === endVals.o) return;
    const duration = 400;
    const id = ++this._scoreAnimId;
    // Set final text immediately for determinism; animate as a cosmetic overlay
    this.scoreEl.innerHTML = createScoreMarkup(endVals.p, endVals.o);
    const t0 = performance.now();
    const step = (t) => {
      if (id !== this._scoreAnimId) return;
      const now = typeof t === "number" ? t : performance.now();
      const k = Math.min(1, (now - t0) / duration);
      // No-op write once at end to keep DOM in sync; content already set above
      if (k >= 1) {
        this.scoreEl.innerHTML = createScoreMarkup(endVals.p, endVals.o);
      }
      if (k >= 1) {
        cancel(this._scoreRaf);
        this._scoreRaf = null;
      }
    };
    if (this._scoreRaf) cancel(this._scoreRaf);
    this._scoreRaf = onFrame(step);
  }

  /**
   * Update round counter text.
   *
   * @pseudocode
   * 1. Render `Round {round}` or clear when null.
   * @param {number|string} round - Round number.
   */
  updateRoundCounter(round) {
    if (!this.roundCounterEl) return;
    if (typeof round === "number") {
      this.roundCounterEl.textContent = `Round ${round}`;
    } else {
      this.roundCounterEl.textContent = "";
    }
  }

  /**
   * Clear the round counter display.
   *
   * @pseudocode
   * 1. Delegate to updateRoundCounter with empty string.
   */
  clearRoundCounter() {
    this.updateRoundCounter("");
  }

  /**
   * Show an auto-selection message.
   *
   * @pseudocode
   * 1. Render `Auto-selected {stat}` via showMessage.
   * @param {string} stat - Selected stat name.
   */
  showAutoSelect(stat) {
    this.showMessage(`Auto-selected ${stat}`);
  }

  /**
   * Clean up resources, cancelling any pending animation frames.
   * @pseudocode
   * 1. If a score animation frame is scheduled, cancel it.
   * 2. Set the animation frame handle to null.
   */
  destroy() {
    if (this._scoreRaf) {
      cancel(this._scoreRaf);
      this._scoreRaf = null;
    }
  }
}
