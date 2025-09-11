import { shouldReduceMotionSync } from "../helpers/motionUtils.js";
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
    if (typeof seconds === "number") {
      this.timerEl.textContent = `Time Left: ${seconds}s`;
    } else {
      this.timerEl.textContent = "";
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
    // Reduced motion → immediate update
    let reduce = false;
    try {
      reduce = !!shouldReduceMotionSync();
    } catch {}
    if (reduce) {
      this.scoreEl.innerHTML = `<span data-side="player">You: ${player}</span> <span data-side="opponent">Opponent: ${opponent}</span>`;
      return;
    }
    // Immediate set for determinism, optional animate when prior spans exist
    const playerSpan = this.scoreEl.querySelector('span[data-side="player"]');
    const opponentSpan = this.scoreEl.querySelector('span[data-side="opponent"]');
    const endVals = { p: Number(player) || 0, o: Number(opponent) || 0 };
    this.scoreEl.innerHTML = `<span data-side="player">You: ${endVals.p}</span> <span data-side="opponent">Opponent: ${endVals.o}</span>`;
    if (!playerSpan || !opponentSpan) return;
    const parse = (el) => {
      if (!el) return 0;
      const m = el.textContent && el.textContent.match(/(\d+)/);
      return m ? Number(m[1]) : 0;
    };
    const startVals = { p: parse(playerSpan), o: parse(opponentSpan) };
    if (startVals.p === endVals.p && startVals.o === endVals.o) return;
    const duration = 400;
    const id = ++this._scoreAnimId;
    const t0 =
      typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    const step = (t) => {
      if (id !== this._scoreAnimId) return;
      const now = typeof performance !== "undefined" && performance.now ? t : Date.now();
      const k = Math.min(1, (now - t0) / duration);
      const curP = Math.round(startVals.p + (endVals.p - startVals.p) * k);
      const curO = Math.round(startVals.o + (endVals.o - startVals.o) * k);
      this.scoreEl.innerHTML = `<span data-side="player">You: ${curP}</span> <span data-side="opponent">Opponent: ${curO}</span>`;
      if (k < 1) {
        this._scoreRaf = requestAnimationFrame(step);
      }
    };
    if (this._scoreRaf)
      try {
        cancelAnimationFrame(this._scoreRaf);
      } catch {}
    this._scoreRaf = requestAnimationFrame(step);
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
}
