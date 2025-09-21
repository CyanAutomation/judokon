import { vi } from "vitest";

/**
 * Shared DOM factory helpers for tests.
 * Provides consistent, mockable DOM elements with realistic behavior.
 */

/**
 * Create a mock stat button element.
 * @param {object} options
 * @param {string} options.label - Button text
 * @param {string} options.aria - ARIA label
 * @param {boolean} options.disabled - Initial disabled state
 * @returns {HTMLElement} Mock button element
 */
export function createStatButton({ label = "Stat", aria = "", disabled = false } = {}) {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.setAttribute("aria-label", aria || label);
  btn.disabled = disabled;
  btn.className = "stat-button";

  // Mock click behavior: prevent default if disabled
  const originalClick = btn.click.bind(btn);
  btn.click = vi.fn(() => {
    if (!btn.disabled) {
      originalClick();
    }
  });

  return btn;
}

/**
 * Create a mock snackbar element.
 * @returns {object} Snackbar mock with show/hide methods and lastMessage property
 */
export function createSnackbar() {
  const el = document.createElement("div");
  el.className = "snackbar";
  el.style.display = "none";

  let _lastMessage = "";

  const show = (message) => {
    _lastMessage = message;
    el.textContent = message;
    el.style.display = "block";
  };

  const hide = () => {
    el.style.display = "none";
  };

  return {
    element: el,
    show,
    hide,
    get lastMessage() {
      return _lastMessage;
    }
  };
}

/**
 * Create a mock scoreboard element.
 * @returns {object} Scoreboard mock with updateScore/render methods
 */
export function createScoreboard() {
  const el = document.createElement("div");
  el.className = "scoreboard";

  let score = { player: 0, opponent: 0 };

  const updateScore = (newScore) => {
    score = { ...score, ...newScore };
    render();
  };

  const render = () => {
    el.innerHTML = `<span>Player: ${score.player}</span> <span>Opponent: ${score.opponent}</span>`;
  };

  render(); // Initial render

  return { element: el, updateScore, render };
}

/**
 * Attach an event spy to an element for testing listener wiring.
 * @param {HTMLElement} el - Element to spy on
 * @param {string} eventName - Event name (e.g., 'click')
 * @returns {function} Spy function that records calls
 */
export function attachEventSpy(el, eventName) {
  const spy = vi.fn();
  el.addEventListener(eventName, spy);
  return spy;
}

/**
 * Create a generic button element.
 * @param {object} options
 * @param {string} options.text - Button text
 * @param {string} options.id - Element id
 * @param {string} options.className - CSS class
 * @param {boolean} options.disabled - Initial disabled state
 * @returns {HTMLButtonElement}
 */
export function createButton({ text = "", id = "", className = "", disabled = false } = {}) {
  const btn = document.createElement("button");
  btn.textContent = text;
  if (id) btn.id = id;
  if (className) btn.className = className;
  btn.disabled = disabled;
  return btn;
}

/**
 * Create a generic div element.
 * @param {object} options
 * @param {string} options.id - Element id
 * @param {string} options.className - CSS class
 * @param {string} options.textContent - Initial text
 * @returns {HTMLDivElement}
 */
export function createDiv({ id = "", className = "", textContent = "" } = {}) {
  const div = document.createElement("div");
  if (id) div.id = id;
  if (className) div.className = className;
  div.textContent = textContent;
  return div;
}

/**
 * Wrapper to mute console.warn/error during test execution.
 * @param {function} fn - Async function to run
 * @returns {Promise} Result of fn
 */
export async function withMutedConsole(fn) {
  const originalWarn = console.warn;
  const originalError = console.error;
  console.warn = vi.fn();
  console.error = vi.fn();

  try {
    return await fn();
  } finally {
    console.warn = originalWarn;
    console.error = originalError;
  }
}