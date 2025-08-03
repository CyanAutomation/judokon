/**
 * Create a battle info bar showing round messages, countdown timer and score.
 *
 * @pseudocode
 * 1. Create three `<p>` elements:
 *    - `#round-message` with `aria-live="polite"`, `aria-atomic="true"`, and `role="status"` for result text.
 *    - `#next-round-timer` with `aria-live="polite"`, `aria-atomic="true"`, and `role="status"` for countdown updates.
 *    - `#score-display` with `aria-live="polite"` and `aria-atomic="true"` for the match score.
 * 2. Append them to the provided container (typically the page header).
 * 3. Store references to these elements for later updates.
 * 4. Return the container element.
 *
 * @returns {HTMLDivElement} The info bar element.
 */
let messageEl;
let timerEl;
let scoreEl;
let intervalId = null;

export function createInfoBar(container = document.createElement("div")) {
  messageEl = document.createElement("p");
  messageEl.id = "round-message";
  messageEl.setAttribute("aria-live", "polite");
  messageEl.setAttribute("aria-atomic", "true");
  messageEl.setAttribute("role", "status");

  timerEl = document.createElement("p");
  timerEl.id = "next-round-timer";
  timerEl.setAttribute("aria-live", "polite");
  timerEl.setAttribute("aria-atomic", "true");
  timerEl.setAttribute("role", "status");

  scoreEl = document.createElement("p");
  scoreEl.id = "score-display";
  scoreEl.setAttribute("aria-live", "polite");
  // Score announcements use a polite live region; consider throttling if updates are frequent.
  scoreEl.setAttribute("aria-atomic", "true");

  container.append(messageEl, timerEl, scoreEl);
  return container;
}

/**
 * Initialize internal references using elements that already exist in the page
 * header.
 *
 * @pseudocode
 * 1. Locate child elements within `container` by their IDs.
 * 2. Store these nodes in module-scoped variables for later updates.
 *
 * @param {HTMLElement} container - Header element containing the info nodes.
 * @returns {void}
 */
export function initInfoBar(container) {
  if (!container) return;
  messageEl = container.querySelector("#round-message");
  timerEl = container.querySelector("#next-round-timer");
  scoreEl = container.querySelector("#score-display");
}

/**
 * Update the round message text.
 *
 * @pseudocode
 * 1. When a message element exists, set its text content to the provided value.
 *
 * @param {string} text - Message to display.
 * @returns {void}
 */
export function showMessage(text) {
  if (messageEl) {
    messageEl.textContent = text;
  }
}

/**
 * Clear the round message.
 *
 * @pseudocode
 * 1. If the message element exists, set its text content to an empty string.
 *
 * @returns {void}
 */
export function clearMessage() {
  if (messageEl) {
    messageEl.textContent = "";
  }
}

/**
 * Display a temporary message and return a function to clear it later.
 *
 * @pseudocode
 * 1. Call `showMessage(text)` to update the round message.
 * 2. Return `clearMessage` so callers can remove the message when finished.
 *
 * @param {string} text - Message to display temporarily.
 * @returns {() => void} Function that clears the message.
 */
export function showTemporaryMessage(text) {
  showMessage(text);
  return clearMessage;
}

/**
 * Start a countdown timer that updates once per second.
 *
 * @pseudocode
 * 1. Clear any existing countdown interval.
 * 2. Display "Next round in: {seconds}s" in the timer element.
 * 3. Each second decrement the value and update the element using the same format.
 * 4. When the value reaches zero, set "Next round in: 0s", stop the interval and invoke `onFinish`.
 *
 * @param {number} seconds - Seconds to count down from.
 * @param {Function} [onFinish] - Optional callback when countdown ends.
 * @returns {void}
 */
export function startCountdown(seconds, onFinish) {
  if (!timerEl) return;
  clearInterval(intervalId);
  timerEl.textContent = `Next round in: ${seconds}s`;
  intervalId = setInterval(() => {
    seconds -= 1;
    if (seconds <= 0) {
      clearInterval(intervalId);
      timerEl.textContent = "Next round in: 0s";
      if (typeof onFinish === "function") onFinish();
    } else {
      timerEl.textContent = `Next round in: ${seconds}s`;
    }
  }, 1000);
}

/**
 * Display the current match score on two lines.
 *
 * @pseudocode
 * 1. Clear existing content and append `"You: {playerScore}"`.
 * 2. Append a line break and `"Opponent: {computerScore}"` on the next line.
 *
 * @param {number} playerScore - Player's score.
 * @param {number} computerScore - Opponent's score.
 * @returns {void}
 */
export function updateScore(playerScore, computerScore) {
  if (scoreEl) {
    // Clear previous score text
    scoreEl.textContent = "";
    // Add "You" and "Opponent" on separate lines
    scoreEl.append(`You: ${playerScore}`);
    scoreEl.appendChild(document.createElement("br"));
    scoreEl.append(`\nOpponent: ${computerScore}`);
  }
}
