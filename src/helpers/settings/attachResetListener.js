/**
 * Attach a click listener to open the reset modal once.
 *
 * @pseudocode
 * 1. Return early if `resetButton` is absent or already bound.
 * 2. Add a click handler that opens the modal.
 * 3. Mark the button as bound to prevent duplicate listeners.
 *
 * @param {HTMLElement|null} resetButton - The reset button element.
 * @param {{ open(trigger?: HTMLElement): void }} modal - Reset modal API.
 */
export function attachResetListener(resetButton, modal) {
  if (!resetButton || resetButton.dataset.resetListenerAttached) return;
  resetButton.addEventListener("click", () => {
    modal.open(resetButton);
  });
  resetButton.dataset.resetListenerAttached = "true";
}
