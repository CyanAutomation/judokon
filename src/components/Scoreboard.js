import { ScoreboardModel } from "./ScoreboardModel.js";
import { ScoreboardView } from "./ScoreboardView.js";

/**
 * Create a battle scoreboard showing round messages, timer, round counter and score.
 *
 * @pseudocode
 * 1. Build required child elements with aria roles.
 * 2. Append them to the provided container.
 * 3. Return the populated container.
 * @param {HTMLDivElement} [container=document.createElement("div")] - Wrapper to populate.
 * @returns {HTMLDivElement} Scoreboard element.
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

let defaultScoreboard = null;

/**
 * Scoreboard composed from separate model and view instances.
 */
export class Scoreboard {
  /**
   * @param {ScoreboardModel} model - State handler.
   * @param {ScoreboardView} view - DOM renderer.
   */
  constructor(model = new ScoreboardModel(), view = new ScoreboardView(model)) {
    this.model = model;
    this.view = view;
    /** @private */
    this._messageLockedUntil = 0;
  }

  /**
   * Display a message with optional outcome lock.
   *
   * @pseudocode
   * 1. Ignore non-outcome messages while locked.
   * 2. Render text via view.showMessage.
   * 3. When outcome, lock for one second.
   * @param {string} text - Message to show.
   * @param {{outcome?:boolean}} [opts] - Outcome flag.
   */
  showMessage(text, opts = {}) {
    const now = Date.now();
    if (now < this._messageLockedUntil && !opts.outcome) return;
    this.view.showMessage(text, opts);
    this._messageLockedUntil = opts.outcome ? now + 1000 : 0;
  }

  clearMessage() {
    this.view.clearMessage();
  }

  /** @param {string} text */
  showTemporaryMessage(text) {
    return this.view.showTemporaryMessage(text);
  }

  /** @param {number} seconds */
  updateTimer(seconds) {
    this.view.updateTimer(seconds);
  }

  clearTimer() {
    this.view.clearTimer();
  }

  /** @param {number} round */
  updateRoundCounter(round) {
    this.view.updateRoundCounter(round);
  }

  clearRoundCounter() {
    this.view.clearRoundCounter();
  }

  /** @param {number} player @param {number} opponent */
  updateScore(player, opponent) {
    this.model.updateScore(player, opponent);
    this.view.updateScore();
  }

  /** @param {string} stat */
  showAutoSelect(stat) {
    this.view.showAutoSelect(stat);
  }

  /**
   * Render a partial patch into model/view.
   *
   * @pseudocode
   * 1. Apply score patch when player & opponent defined.
   * 2. Forward message (with outcome) and timer/round updates.
   * 3. Return void.
   * @param {object} patch - Partial state updates.
   */
  render(patch = {}) {
    if (patch.score) {
      const { player, opponent } = patch.score;
      const havePlayer = player !== undefined;
      const haveOpponent = opponent !== undefined;
      if (havePlayer && haveOpponent) {
        this.updateScore(player, opponent);
      }
    }
    if (patch.message) {
      const msg = typeof patch.message === "string" ? { text: patch.message } : patch.message;
      this.showMessage(msg.text, { outcome: msg.outcome });
    }
    if ("timerSeconds" in patch) {
      this.updateTimer(patch.timerSeconds);
    }
    if ("roundNumber" in patch) {
      this.updateRoundCounter(patch.roundNumber);
    }
  }

  /**
   * Return readonly model state.
   *
   * @pseudocode
   * 1. Delegate to model.getState.
   * @returns {{score:{player:number,opponent:number}}}
   */
  getState() {
    return this.model.getState();
  }

  destroy() {
    /* no-op for simplified implementation */
  }
}

/**
 * Initialize default scoreboard instance from container.
 *
 * @pseudocode
 * 1. Locate child elements within container.
 * 2. Create model and view bound to them.
 * 3. Store default scoreboard for module-level helpers.
 * @param {HTMLElement|null} container - Header container or null for headless.
 */
export function initScoreboard(container) {
  if (!container) {
    defaultScoreboard = new Scoreboard();
    return;
  }
  const model = new ScoreboardModel();
  const view = new ScoreboardView(model, {
    messageEl: container.querySelector("#round-message"),
    timerEl: container.querySelector("#next-round-timer"),
    roundCounterEl: container.querySelector("#round-counter"),
    scoreEl: container.querySelector("#score-display")
  });
  defaultScoreboard = new Scoreboard(model, view);
}

export const showMessage = (text, opts) => defaultScoreboard?.showMessage(text, opts);
export const clearMessage = () => defaultScoreboard?.clearMessage();
export const showTemporaryMessage = (text) => defaultScoreboard?.showTemporaryMessage(text);
export const updateTimer = (s) => defaultScoreboard?.updateTimer(s);
export const clearTimer = () => defaultScoreboard?.clearTimer();
export const updateRoundCounter = (n) => defaultScoreboard?.updateRoundCounter(n);
export const clearRoundCounter = () => defaultScoreboard?.clearRoundCounter();
export const updateScore = (p, o) => defaultScoreboard?.updateScore(p, o);
export const showAutoSelect = (stat) => defaultScoreboard?.showAutoSelect(stat);
export const render = (patch) => defaultScoreboard?.render(patch);
export const getState = () =>
  defaultScoreboard?.getState() ?? { score: { player: 0, opponent: 0 } };
export const destroy = () => {
  defaultScoreboard = null;
};
