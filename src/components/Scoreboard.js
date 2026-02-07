import { ScoreboardModel } from "./ScoreboardModel.js";
import { ScoreboardView } from "./ScoreboardView.js";
import { createScoreboardCore } from "./scoreboardCore.js";
import { createScoreboardDomAdapter } from "./scoreboardDomAdapter.js";
import {
  showMessage as showRoundMessage,
  clearMessage as clearRoundMessage,
  showTemporaryMessage as showTemporaryRoundMessage,
  updateTimer as updateRoundTimer,
  clearTimer as clearRoundTimer,
  updateRoundCounter as updateRoundCounterDisplay,
  clearRoundCounter as clearRoundCounterDisplay,
  showAutoSelect as showAutoSelectMessage
} from "../helpers/roundStatusDisplay.js";

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
  messageEl.setAttribute("data-testid", "round-message");

  const timerEl = document.createElement("p");
  timerEl.id = "next-round-timer";
  timerEl.setAttribute("aria-live", "polite");
  timerEl.setAttribute("aria-atomic", "true");
  timerEl.setAttribute("role", "status");
  timerEl.setAttribute("data-testid", "next-round-timer");
  const timerLabel = document.createElement("span");
  timerLabel.dataset.part = "label";
  timerLabel.textContent = "Time Left:";
  const timerValue = document.createElement("span");
  timerValue.dataset.part = "value";
  timerValue.textContent = "0s";
  timerEl.append(timerLabel, document.createTextNode(" "), timerValue);

  const roundCounterEl = document.createElement("p");
  roundCounterEl.id = "round-counter";
  roundCounterEl.setAttribute("aria-live", "polite");
  roundCounterEl.setAttribute("aria-atomic", "true");
  roundCounterEl.setAttribute("data-testid", "round-counter");

  const scoreEl = document.createElement("p");
  scoreEl.id = "score-display";
  scoreEl.setAttribute("aria-live", "polite");
  scoreEl.setAttribute("aria-atomic", "true");
  scoreEl.setAttribute("role", "status");
  scoreEl.setAttribute("data-testid", "score-display");
  const playerSpan = document.createElement("span");
  playerSpan.dataset.side = "player";
  const playerLabel = document.createElement("span");
  playerLabel.dataset.part = "label";
  playerLabel.textContent = "You:";
  const playerValue = document.createElement("span");
  playerValue.dataset.part = "value";
  playerValue.textContent = "0";
  playerSpan.append(playerLabel, document.createTextNode(" "), playerValue);

  const opponentSpan = document.createElement("span");
  opponentSpan.dataset.side = "opponent";
  const opponentLabel = document.createElement("span");
  opponentLabel.dataset.part = "label";
  opponentLabel.textContent = "Opponent:";
  const opponentValue = document.createElement("span");
  opponentValue.dataset.part = "value";
  opponentValue.textContent = "0";
  opponentSpan.append(opponentLabel, document.createTextNode(" "), opponentValue);

  scoreEl.append(playerSpan, document.createTextNode("\n"), opponentSpan);

  container.append(messageEl, timerEl, roundCounterEl, scoreEl);
  return container;
}

let defaultScoreboard = null;

/**
 * Scoreboard composed from separate model and view instances, focused on score display.
 */
export class Scoreboard {
  /**
   * @param {ScoreboardModel} model - State handler.
   * @param {ScoreboardView} view - DOM renderer.
   */
  constructor(model = new ScoreboardModel(), view = new ScoreboardView(model)) {
    this.model = model;
    this.view = view;
    this.adapter = createScoreboardDomAdapter({ model, view });
    this.core = createScoreboardCore(this.adapter);
    this.core.start();
  }

  /**
   * Display a message with optional outcome lock.
   *
   * @pseudocode
   * 1. Forward to round status display helper.
   * @param {string} text - Message to show.
   * @param {{outcome?:boolean,outcomeType?:string}} [opts] - Outcome flags.
   */
  showMessage(text, opts = {}) {
    showRoundMessage(text, opts);
  }

  clearMessage() {
    clearRoundMessage();
  }

  /** @param {string} text */
  showTemporaryMessage(text) {
    return showTemporaryRoundMessage(text);
  }

  /** @param {number} seconds */
  updateTimer(seconds) {
    updateRoundTimer(seconds);
  }

  clearTimer() {
    clearRoundTimer();
  }

  /** @param {number} round */
  updateRoundCounter(round) {
    updateRoundCounterDisplay(round);
  }

  clearRoundCounter() {
    clearRoundCounterDisplay();
  }

  /** @param {number} player @param {number} opponent */
  updateScore(player, opponent) {
    this.core.updateScore(player, opponent);
  }

  /** @param {string} stat */
  showAutoSelect(stat) {
    showAutoSelectMessage(stat);
  }

  /**
   * Render a partial patch into model/view.
   *
   * @pseudocode
   * 1. Apply score patch when player & opponent numbers.
   * 2. Return void.
   * @param {object} patch - Partial state updates.
   */
  render(patch = {}) {
    this.core.render(patch);
  }

  /**
   * Return readonly model state.
   *
   * @pseudocode
   * 1. Delegate to model.getState.
   * @returns {{score:{player:number,opponent:number}}}
   */
  getState() {
    return this.core.getState();
  }

  destroy() {
    this.core.dispose();
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
 * 1. If no container is provided, create a headless scoreboard and exit.
 * 2. If a default scoreboard with a view already exists, do nothing.
 * 3. Create a new ScoreboardModel.
 * 4. Create a new ScoreboardView, locating child elements within the container.
 * 5. Ensure the score element participates in the shared polite live region.
 * 6. Create a new Scoreboard with the model and view, and store it as the default.
 *
 * @param {HTMLElement|null} container - Header container or null for headless.
 * @param {object} [_controls] - Deprecated controls parameter retained only for backward compatibility; ignored.
 * @returns {void}
 * @deprecated The `_controls` parameter is unused and will be removed in a future release.
 */
export function initScoreboard(container, _controls) {
  void _controls;
  if (!container) {
    // Try to find the elements by id even if container is null
    const messageEl = document.getElementById("round-message");
    const timerEl = document.getElementById("next-round-timer");
    const roundCounterEl = document.getElementById("round-counter");
    const scoreEl = document.getElementById("score-display");
    if (messageEl || timerEl || roundCounterEl || scoreEl) {
      const model = new ScoreboardModel();
      const view = new ScoreboardView(model, {
        rootEl: null,
        messageEl,
        timerEl,
        roundCounterEl,
        scoreEl
      });
      defaultScoreboard = new Scoreboard(model, view);
    } else {
      defaultScoreboard = new Scoreboard();
    }
    return;
  }
  if (defaultScoreboard?.view) {
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
export const showMessage = (text, opts) => showRoundMessage(text, opts);

/**
 * Clear any scoreboard message.
 *
 * @pseudocode
 * 1. Invoke `clearMessage` on `defaultScoreboard` when present.
 *
 * @returns {void}
 */
export const clearMessage = () => clearRoundMessage();

/**
 * Show a temporary message that disappears automatically.
 *
 * @pseudocode
 * 1. Forward text to `showTemporaryMessage` on the default scoreboard.
 *
 * @param {string} text - Message to display briefly.
 * @returns {Promise<void>|void} Result of the underlying call.
 */
export const showTemporaryMessage = (text) => showTemporaryRoundMessage(text);

/**
 * Update the visible round timer.
 *
 * @pseudocode
 * 1. If the scoreboard exists, call `updateTimer(seconds)`.
 *
 * @param {number} s - Seconds remaining.
 * @returns {void}
 */
export const updateTimer = (s) => updateRoundTimer(s);

/**
 * Clear the round timer display.
 *
 * @pseudocode
 * 1. Delegate to `clearTimer` on the default scoreboard when present.
 *
 * @returns {void}
 */
export const clearTimer = () => clearRoundTimer();

/**
 * Update the round counter on the scoreboard.
 *
 * @pseudocode
 * 1. Forward the round number to `updateRoundCounter` if the scoreboard exists.
 *
 * @param {number} n - Current round number.
 * @returns {void}
 */
export const updateRoundCounter = (n) => updateRoundCounterDisplay(n);

/**
 * Clear the round counter display.
 *
 * @pseudocode
 * 1. Call `clearRoundCounter` on the default scoreboard when available.
 *
 * @returns {void}
 */
export const clearRoundCounter = () => clearRoundCounterDisplay();

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
export const showAutoSelect = (stat) => showAutoSelectMessage(stat);

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
 * Reset the default scoreboard reference.
 *
 * @pseudocode
 * 1. Set `defaultScoreboard` to `null` for a clean slate.
 *
 * @returns {void}
 */
export const resetScoreboard = () => {
  defaultScoreboard = null;
};

/**
 * Destroy the default scoreboard instance.
 *
 * @pseudocode
 * 1. Delegate to `resetScoreboard` so helpers no longer forward calls.
 *
 * @returns {void}
 */
export const destroy = () => {
  if (defaultScoreboard) {
    defaultScoreboard.destroy();
  }
  resetScoreboard();
};
