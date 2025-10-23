/**
 * Handle left/right arrow key navigation within a radio/button container.
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
/**
 * Handle arrow-key navigation among a group of controls inside `container`.
 *
 * @summary Move focus left/right between elements matching `selector` when Arrow keys are pressed.
 * @pseudocode
 * 1. Exit if the key is not ArrowLeft or ArrowRight.
 * 2. Find controls inside `container` matching the provided selector.
 * 3. Locate the index of the currently focused element.
 * 4. Prevent default navigation, compute the next index, and focus the next element.
 * 5. If the target is a radio input, update its checked state and dispatch a change event.
 *
 * @param {KeyboardEvent} event - The originating keyboard event.
 * @param {Element} container - Container element that holds the buttons.
 * @param {string} selector - CSS selector for the target focusable elements.
 * @returns {void}
 */
export function handleKeyboardNavigation(event, container, selector) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
    return;
  }

  const elements = Array.from(container.querySelectorAll(selector));
  const current = document.activeElement;
  const index = elements.indexOf(current);
  if (index !== -1 && elements.length > 0) {
    event.preventDefault();
    const offset = event.key === "ArrowRight" ? 1 : -1;
    const next = (index + offset + elements.length) % elements.length;
    const nextElement = elements[next];

    if (nextElement instanceof HTMLInputElement && nextElement.type === "radio") {
      nextElement.checked = true;
      nextElement.dispatchEvent(new Event("change", { bubbles: true }));
    }

    nextElement.focus();
  }
}

export default handleKeyboardNavigation;
