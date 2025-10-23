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
 * Handle arrow-key navigation among the country filter radios inside `container`.
 *
 * @summary Move focus left/right between the `country-filter` radio inputs when Arrow keys are pressed.
 * @pseudocode
 * 1. Exit early when the pressed key is neither ArrowLeft nor ArrowRight.
 * 2. Collect all radio inputs in the `country-filter` group.
 * 3. Resolve the active index from the focused radio or currently checked radio.
 * 4. Prevent default behavior, determine the next index, and move focus.
 * 5. Check the next radio and dispatch a change event so downstream listeners react.
 *
 * @param {KeyboardEvent} event - The originating keyboard event.
 * @param {Element} container - Container element that holds the buttons.
 * @param {string} buttonClass - CSS class for the target buttons.
 * @returns {void}
 */
export function handleKeyboardNavigation(event, container, buttonClass) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
    return;
  }

  // Retain the legacy signature; class parameter no longer influences the lookup.
  void buttonClass;

  const radios = Array.from(
    container.querySelectorAll('[type="radio"][name="country-filter"]')
  );
  if (radios.length === 0) {
    return;
  }

  const activeElement = document.activeElement;
  let index = radios.indexOf(activeElement);
  if (index === -1) {
    const checked = container.querySelector('[type="radio"][name="country-filter"]:checked');
    index = checked ? radios.indexOf(checked) : -1;
  }
  if (index === -1) {
    index = 0;
  }

  event.preventDefault();
  const offset = event.key === "ArrowRight" ? 1 : -1;
  const nextIndex = (index + offset + radios.length) % radios.length;
  const nextRadio = radios[nextIndex];
  const currentRadio = radios[index];
  if (nextRadio === currentRadio) {
    return;
  }
  nextRadio.checked = true;
  nextRadio.focus();
  nextRadio.dispatchEvent(new Event("change", { bubbles: true }));
}

export default handleKeyboardNavigation;
