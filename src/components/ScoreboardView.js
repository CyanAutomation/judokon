export class ScoreboardView {
  constructor(model, { messageEl, timerEl, roundCounterEl, scoreEl } = {}) {
    this.model = model;
    this.messageEl = messageEl;
    this.timerEl = timerEl;
    this.roundCounterEl = roundCounterEl;
    this.scoreEl = scoreEl;
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
    this.scoreEl.innerHTML = `<span data-side="player">You: ${player}</span> <span data-side="opponent">Opponent: ${opponent}</span>`;
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
