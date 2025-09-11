/**
 * Executes a callback function once the Document Object Model (DOM) is fully loaded.
 *
 * @summary This function provides a reliable way to run code only after the
 * browser has parsed the entire HTML and all deferred scripts have executed.
 *
 * @pseudocode
 * 1. Check if the environment is a browser by verifying `document` is defined. If not, exit.
 * 2. Check the `document.readyState`.
 * 3. If `document.readyState` is not `"loading"` (meaning it's already "interactive" or "complete"), execute the provided callback function `fn` immediately.
 * 4. Otherwise (if `document.readyState` is "loading"), add a one-time event listener for the `DOMContentLoaded` event on `document`. When this event fires, execute `fn`.
 *
 * @param {() => void} fn - The function to be executed when the DOM is ready.
 * @returns {void}
 */
export function onDomReady(fn) {
  if (typeof document === "undefined") {
    // In non-browser environments, do nothing.
    return;
  }
  if (document.readyState !== "loading") {
    fn();
  } else {
    document.addEventListener("DOMContentLoaded", fn, { once: true });
  }
}
