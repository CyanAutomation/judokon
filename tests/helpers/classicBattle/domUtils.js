import { isConsoleMocked, shouldShowTestLogs } from "../../../src/helpers/testLogGate.js";
import { clearMessage as clearScoreboardMessage } from "../../../src/helpers/setupScoreboard.js";

const debugLog = (...args) => {
  if (typeof console === "undefined") return;
  if (shouldShowTestLogs() || isConsoleMocked(console.log)) {
    console.log(...args);
  }
};

debugLog("[TEST DEBUG] domUtils.js top-level loaded");
/**
 * Create a container element for snackbar messages.
 *
 * @pseudocode
 * 1. Create a `div` element named `container`.
 * 2. Set its `id` to "snackbar-container".
 * 3. Set the `role` attribute to "status".
 * 4. Set the `aria-live` attribute to "polite".
 * 5. Append `container` to `document.body`.
 * 6. Return `container`.
 *
 * @returns {HTMLDivElement} The snackbar container element.
 */
export function createSnackbarContainer() {
  const container = document.createElement("div");
  container.id = "snackbar-container";
  container.setAttribute("role", "status");
  container.setAttribute("aria-live", "polite");
  document.body.appendChild(container);
  return container;
}

/**
 * Create a paragraph element for round messages.
 *
 * @pseudocode
 * 1. Create a `p` element named `el`.
 * 2. Set its `id` to the provided `id`.
 * 3. Set the `aria-live` attribute to "polite".
 * 4. Set the `aria-atomic` attribute to "true".
 * 5. Set the `role` attribute to "status".
 * 6. Append `el` to `document.body`.
 * 7. Return `el`.
 *
 * @param {string} [id="round-message"] - ID to assign to the element.
 * @returns {HTMLParagraphElement} The round message element.
 */
export function createRoundMessage(id = "round-message") {
  const el = document.createElement("p");
  el.id = id;
  el.setAttribute("aria-live", "polite");
  el.setAttribute("aria-atomic", "true");
  el.setAttribute("role", "status");
  document.body.appendChild(el);
  return el;
}

/**
 * Create button and timer elements for advancing rounds.
 *
 * @pseudocode
 * 1. Create a `button` element named `nextButton`.
 * 2. Set its `id` to "next-button".
 * 3. Set its `data-role` to "next-round".
 * 4. Create a `p` element named `nextRoundTimer`.
 * 5. Set its `id` to "next-round-timer".
 * 6. Set the `aria-live` attribute of `nextRoundTimer` to "polite".
 * 7. Set the `aria-atomic` attribute of `nextRoundTimer` to "true".
 * 8. Set the `role` attribute of `nextRoundTimer` to "status".
 * 9. Append `nextButton` and `nextRoundTimer` to `document.body`.
 * 10. Return an object containing both nodes.
 *
 * @returns {{nextButton: HTMLButtonElement, nextRoundTimer: HTMLParagraphElement}}
 *   Nodes for controlling the next round timer.
 */
export function createTimerNodes() {
  const nextButton = document.createElement("button");
  nextButton.id = "next-button";
  nextButton.setAttribute("data-role", "next-round");
  const nextRoundTimer = document.createElement("p");
  nextRoundTimer.id = "next-round-timer";
  nextRoundTimer.setAttribute("data-testid", "next-round-timer");
  nextRoundTimer.setAttribute("aria-live", "polite");
  nextRoundTimer.setAttribute("aria-atomic", "true");
  nextRoundTimer.setAttribute("role", "status");
  const labelSpan = document.createElement("span");
  labelSpan.dataset.part = "label";
  const valueSpan = document.createElement("span");
  valueSpan.dataset.part = "value";
  nextRoundTimer.append(labelSpan, valueSpan);
  document.body.append(nextButton, nextRoundTimer);
  return { nextButton, nextRoundTimer };
}

/**
 * Clear the round message using the scoreboard helper when available.
 *
 * @pseudocode
 * 1. Invoke `scoreboard.clearMessage()` via the helper to mirror production behaviour.
 * 2. Fallback to direct DOM cleanup when the scoreboard has not been initialised.
 */
export function clearRoundMessage() {
  try {
    clearScoreboardMessage();
  } catch {}

  try {
    if (typeof document === "undefined") return;
    const el = document.getElementById("round-message");
    if (!el) return;
    el.textContent = "";
    if (el.dataset && "outcome" in el.dataset) {
      delete el.dataset.outcome;
    }
  } catch {}
}
