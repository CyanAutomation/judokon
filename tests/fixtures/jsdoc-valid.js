/**
 * Build the scoreboard view and wire handlers.
 * @pseudocode
 * 1. Create a scoreboard container.
 * 2. Render the current round data.
 * 3. Attach event handlers for updates.
 * @param {HTMLElement} root - The parent element for the view.
 * @param {object} _state - The current scoreboard state.
 * @returns {HTMLElement} The initialized scoreboard element.
 */
// eslint-disable-next-line no-unused-vars
export function createScoreboardView(root, _state) {
  const element = document.createElement("div");
  element.className = "scoreboard";
  root.append(element);
  return element;
}
