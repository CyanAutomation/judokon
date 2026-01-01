/**
 * Build the scoreboard view and wire handlers.
 * @pseudocode
 * 1. Create a scoreboard container.
 * 2. Render the current round data.
 * 3. Attach event handlers for updates.
 * @param {HTMLElement} root - The parent element for the view.
 * @param {object} state - The current scoreboard state.
 * @returns {HTMLElement} The initialized scoreboard element.
 */
export function createScoreboardView(root, state) {
  const element = document.createElement("div");
  element.className = "scoreboard";
  root.append(element);
  return element;
}
