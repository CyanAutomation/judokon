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
 * 4. Set its `data-testid` to "next-button".
 * 5. Create a `p` element named `nextRoundTimer`.
 * 6. Set its `id` to "next-round-timer".
 * 7. Set the `aria-live` attribute of `nextRoundTimer` to "polite".
 * 8. Set the `aria-atomic` attribute of `nextRoundTimer` to "true".
 * 9. Set the `role` attribute of `nextRoundTimer` to "status".
 * 10. Append `nextButton` and `nextRoundTimer` to `document.body`.
 * 11. Return an object containing both nodes.
 *
 * @returns {{nextButton: HTMLButtonElement, nextRoundTimer: HTMLParagraphElement}}
 *   Nodes for controlling the next round timer.
 */
export function createTimerNodes() {
  const nextButton = document.createElement("button");
  nextButton.id = "next-button";
  nextButton.setAttribute("data-role", "next-round");
  nextButton.setAttribute("data-testid", "next-button");
  const nextRoundTimer = document.createElement("p");
  nextRoundTimer.id = "next-round-timer";
  nextRoundTimer.setAttribute("aria-live", "polite");
  nextRoundTimer.setAttribute("aria-atomic", "true");
  nextRoundTimer.setAttribute("role", "status");
  document.body.append(nextButton, nextRoundTimer);
  return { nextButton, nextRoundTimer };
}
