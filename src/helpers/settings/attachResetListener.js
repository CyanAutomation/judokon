/**
 * Attaches a click listener to a reset button that, when clicked, opens a
 * specified modal. The listener is attached only once to prevent duplicate
 * event bindings.
 *
 * @summary This function provides a mechanism to trigger a modal dialog
 * (e.g., for confirming a reset action) from a button click.
 *
 * @pseudocode
 * 1. Check if `resetButton` is null or if it already has the `data-reset-listener-attached` attribute set to "true". If either condition is met, exit early to prevent re-attaching the listener.
 * 2. Add a `click` event listener to the `resetButton`.
 * 3. Inside the click handler, call `modal.open(resetButton)` to display the modal, passing the button as the trigger element.
 * 4. Set the `data-reset-listener-attached` attribute on `resetButton` to "true" to mark that the listener has been attached.
 *
 * @param {HTMLElement|null} resetButton - The HTML element that serves as the reset button.
 * @param {{ open(trigger?: HTMLElement): void }} modal - An object representing the modal, which must have an `open` method.
 * @returns {void}
 */
export function attachResetListener(resetButton, modal) {
  if (!resetButton || resetButton.dataset.resetListenerAttached) return;
  resetButton.addEventListener("click", () => {
    modal.open(resetButton);
  });
  resetButton.dataset.resetListenerAttached = "true";
}
