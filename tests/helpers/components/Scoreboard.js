import { ScoreboardModel } from "../../../src/components/ScoreboardModel.js";
import { ScoreboardView } from "../../../src/components/ScoreboardView.js";

/**
 * Create a mock Scoreboard factory for testing.
 * Uses the real ScoreboardModel and ScoreboardView for realistic behavior.
 *
 * @param {HTMLDivElement} [container] - Optional container element
 * @returns {object} Mock scoreboard with element and control methods
 */
export function createScoreboard(container) {
  // Create container if not provided
  if (!container) {
    container = document.createElement("div");
  }

  // Create required child elements with proper attributes
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

  // Append elements to container
  container.append(messageEl, timerEl, roundCounterEl, scoreEl);

  // Create model and view instances
  const model = new ScoreboardModel();
  const view = new ScoreboardView(model, {
    messageEl,
    timerEl,
    scoreEl,
    roundCounterEl
  });

  // Create scoreboard instance
  const scoreboard = { model, view };

  // Helper methods for testing
  const render = (state) => {
    // This is a simplified render that updates the view directly
    if (state.message) {
      scoreboard.view.showMessage(state.message.text || state.message, state.message);
    }
    if (state.timerSeconds !== undefined) {
      scoreboard.view.updateTimer(state.timerSeconds);
    }
    if (state.score) {
      scoreboard.model.updateScore(state.score.player || 0, state.score.opponent || 0);
      scoreboard.view.updateScore();
    }
    if (state.roundNumber !== undefined) {
      scoreboard.view.updateRoundCounter(state.roundNumber);
    }
  };

  const updateScore = (score) => {
    scoreboard.model.updateScore(score.player || 0, score.opponent || 0);
    scoreboard.view.updateScore();
  };

  const updateTimer = (seconds) => {
    scoreboard.view.updateTimer(seconds);
  };

  const updateMessage = (text) => {
    scoreboard.view.showMessage(text);
  };

  const updateRound = (roundNumber) => {
    scoreboard.view.updateRoundCounter(roundNumber);
  };

  // Getter methods for testing
  const getScore = () => scoreboard.model.getState().score;
  const getTimer = () => {
    // Timer state is not stored in model, so we can't easily get it
    // Return null to indicate this limitation
    return null;
  };
  const getMessage = () => {
    // Message state is not stored, return null
    return null;
  };
  const getRound = () => {
    // Round state is not stored in model, return null
    return null;
  };

  return {
    element: container,
    model,
    view,
    render,
    updateScore,
    updateTimer,
    updateMessage,
    updateRound,
    getScore,
    getTimer,
    getMessage,
    getRound
  };
}
