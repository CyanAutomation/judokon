/**
 * Handle left/right arrow key navigation within a button container.
 *
 * @pseudocode
 * 1. Exit if the key is not ArrowLeft or ArrowRight.
 * 2. Get all buttons with the specified class in the container.
 * 3. Find the index of the currently focused button.
 * 4. If focus is within the buttons, prevent default and calculate the next index.
 * 5. Move focus to the button at the next index.
 *
 * @param {KeyboardEvent} event
 * @param {Element} container
 * @param {string} buttonClass
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export function handleKeyboardNavigation(event, container, buttonClass) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
    return;
  }

  const buttons = Array.from(container.querySelectorAll(`button.${buttonClass}`));
  const current = document.activeElement;
  const index = buttons.indexOf(current);
  if (index !== -1) {
    event.preventDefault();
    const offset = event.key === "ArrowRight" ? 1 : -1;
    const next = (index + offset + buttons.length) % buttons.length;
    buttons[next].focus();
  }
}

export default handleKeyboardNavigation;
