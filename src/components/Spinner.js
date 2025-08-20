import { SPINNER_DELAY_MS } from "../helpers/constants.js";

/**
 * Create a loading spinner and helper methods to control its visibility.
 *
 * @pseudocode
 * 1. Create `<div class="loading-spinner" aria-hidden="true">` and append to `parent`.
 * 2. Hide the spinner initially and expose `show`, `hide`, and `remove` helpers.
 *    - `show` displays the spinner after `delay` milliseconds.
 *    - `hide` clears any pending timer and hides the spinner.
 *    - `remove` clears the timer and removes the spinner from the DOM.
 * 3. Return the spinner element and helper methods.
 *
 * @param {HTMLElement} parent - Element to append the spinner to.
 * @param {object} [options]
 * @param {number} [options.delay=SPINNER_DELAY_MS] - Delay before showing the spinner.
 * @returns {{element:HTMLDivElement, show:() => void, hide:() => void, remove:() => void}} Spinner controls.
 */
export function createSpinner(parent, { delay = SPINNER_DELAY_MS } = {}) {
  const element = document.createElement("div");
  element.className = "loading-spinner";
  element.setAttribute("aria-hidden", "true");
  element.style.display = "none";
  parent.appendChild(element);

  let timerId;

  const show = () => {
    clearTimeout(timerId);
    timerId = setTimeout(() => {
      element.style.display = "block";
    }, delay);
  };

  const hide = () => {
    clearTimeout(timerId);
    timerId = undefined;
    element.style.display = "none";
  };

  const remove = () => {
    clearTimeout(timerId);
    timerId = undefined;
    element.remove();
  };

  return { element, show, hide, remove };
}
