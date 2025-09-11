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
  scoreEl.setAttribute("aria-live", "off");
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
   * 1. Apply score patch when player & opponent numbers.
   * 2. Forward message (with outcome) and timer/round updates.
   * 3. Return void.
   * @param {object} patch - Partial state updates.
   */
  render(patch = {}) {
    if (patch.score) {
      const { player, opponent } = patch.score;
      const playerIsNumber = typeof player === "number";
      const opponentIsNumber = typeof opponent === "number";
      if (playerIsNumber && opponentIsNumber) {
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
    try {
      import("../helpers/battleScoreboard.js")
        .then((m) => {
          try {
            if (typeof m.disposeBattleScoreboardAdapter === "function")
              m.disposeBattleScoreboardAdapter();
          } catch {}
        })
        .catch(() => {});
    } catch {}
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
 * @param {object} [_controls] - Deprecated controls parameter retained only for backward compatibility; ignored.
 * @deprecated The `_controls` parameter is unused and will be removed in a future release.
 */
export function initScoreboard(container, _controls) {
  void _controls;
  if (!container) {
    defaultScoreboard = new Scoreboard();
    return;
  }
  if (defaultScoreboard) {
    return;
  }
  const model = new ScoreboardModel();
  const view = new ScoreboardView(model, {
    rootEl: container,
    messageEl: container.querySelector("#round-message"),
    timerEl: container.querySelector("#next-round-timer"),
    roundCounterEl: container.querySelector("#round-counter"),
    scoreEl: container.querySelector("#score-display")
  });
  try {
    if (view && view.scoreEl) view.scoreEl.setAttribute("aria-live", "off");
  } catch {}
  defaultScoreboard = new Scoreboard(model, view);
}

/**
 * Display a message via the default scoreboard if available.
 *
 * @pseudocode
 * 1. If `defaultScoreboard` exists, call `showMessage` with the provided args.
 * 2. Otherwise, do nothing.
 *
 * @param {string} text - Message to show.
 * @param {{outcome?: boolean}} [opts] - Outcome flag locking the message.
 * @returns {void}
 */
export const showMessage = (text, opts) => defaultScoreboard?.showMessage(text, opts);

/**
 * Clear any scoreboard message.
 *
 * @pseudocode
 * 1. Invoke `clearMessage` on `defaultScoreboard` when present.
 *
 * @returns {void}
 */
export const clearMessage = () => defaultScoreboard?.clearMessage();

/**
 * Show a temporary message that disappears automatically.
 *
 * @pseudocode
 * 1. Forward text to `showTemporaryMessage` on the default scoreboard.
 *
 * @param {string} text - Message to display briefly.
 * @returns {Promise<void>|void} Result of the underlying call.
 */
export const showTemporaryMessage = (text) => defaultScoreboard?.showTemporaryMessage(text);

/**
 * Update the visible round timer.
 *
 * @pseudocode
 * 1. If the scoreboard exists, call `updateTimer(seconds)`.
 *
 * @param {number} s - Seconds remaining.
 * @returns {void}
 */
export const updateTimer = (s) => defaultScoreboard?.updateTimer(s);

/**
 * Clear the round timer display.
 *
 * @pseudocode
 * 1. Delegate to `clearTimer` on the default scoreboard when present.
 *
 * @returns {void}
 */
export const clearTimer = () => defaultScoreboard?.clearTimer();

/**
 * Update the round counter on the scoreboard.
 *
 * @pseudocode
 * 1. Forward the round number to `updateRoundCounter` if the scoreboard exists.
 *
 * @param {number} n - Current round number.
 * @returns {void}
 */
export const updateRoundCounter = (n) => defaultScoreboard?.updateRoundCounter(n);

/**
 * Clear the round counter display.
 *
 * @pseudocode
 * 1. Call `clearRoundCounter` on the default scoreboard when available.
 *
 * @returns {void}
 */
export const clearRoundCounter = () => defaultScoreboard?.clearRoundCounter();

/**
 * Update player and opponent scores.
 *
 * @pseudocode
 * 1. Delegate to `updateScore(player, opponent)` on the default scoreboard.
 *
 * @param {number} p - Player score.
 * @param {number} o - Opponent score.
 * @returns {void}
 */
export const updateScore = (p, o) => defaultScoreboard?.updateScore(p, o);

/**
 * Highlight an auto-selected stat on the scoreboard.
 *
 * @pseudocode
 * 1. Forward the stat key to `showAutoSelect` when a scoreboard exists.
 *
 * @param {string} stat - Stat identifier.
 * @returns {void}
 */
export const showAutoSelect = (stat) => defaultScoreboard?.showAutoSelect(stat);

/**
 * Render a partial state patch into the default scoreboard.
 *
 * @pseudocode
 * 1. If the scoreboard exists, call its `render(patch)`.
 *
 * @param {object} patch - Partial scoreboard state.
 * @returns {void}
 */
export const render = (patch) => defaultScoreboard?.render(patch);

/**
 * Get the current scoreboard state or a default structure.
 *
 * @pseudocode
 * 1. Return `defaultScoreboard.getState()` when available.
 * 2. Otherwise return zeroed score object.
 *
 * @returns {{score:{player:number,opponent:number}}}
 */
export const getState = () =>
  defaultScoreboard?.getState() ?? { score: { player: 0, opponent: 0 } };

/**
 * Destroy the default scoreboard instance.
 *
 * @pseudocode
 * 1. Set `defaultScoreboard` to `null` so helpers no longer forward calls.
 *
 * @returns {void}
 */
export const destroy = () => {
  defaultScoreboard = null;
};
