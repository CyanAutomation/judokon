/**
 * Handle left/right arrow key navigation within a button container.
 *
 * @pseudocode
 * 1. Get all buttons with the specified class in the container.
 * 2. Find the index of the currently focused button.
 * 3. If a navigational key (ArrowLeft/ArrowRight) is pressed, prevent default.
 * 4. Calculate the next index by wrapping around.
 * 5. Move focus to the button at the next index.
 *
 * @param {KeyboardEvent} event
 * @param {Element} container
 * @param {string} buttonClass
 */
export function handleKeyboardNavigation(event, container, buttonClass) {
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
