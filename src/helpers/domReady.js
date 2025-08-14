/**
 * Execute a callback once the DOM is fully loaded.
 *
 * @pseudocode
 * 1. If `document.readyState` is not `"loading"`, invoke the callback immediately.
 * 2. Otherwise, register a one-time `DOMContentLoaded` listener that runs the callback.
 *
 * @param {() => void} fn - Function to run when the DOM is ready.
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
