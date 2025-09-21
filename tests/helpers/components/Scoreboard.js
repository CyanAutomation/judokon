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
    scoreboard.render(state);
  };

  const updateScore = (score) => {
    render({ score });
  };

  const updateTimer = (seconds) => {
    render({ timerSeconds: seconds });
  };

  const updateMessage = (text) => {
    render({ message: { text } });
  };

  const updateRound = (roundNumber) => {
    render({ roundNumber });
  };

  // Getter methods for testing
  const getScore = () => model.getScore();
  const getTimer = () => model.getTimerSeconds();
  const getMessage = () => model.getMessage();
  const getRound = () => model.getRoundNumber();

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
