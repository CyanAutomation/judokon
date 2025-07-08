/**
 * Initialize the bottom navigation bar and button effects when the DOM is ready.
 *
 * @pseudocode
 * 1. Import `populateNavbar` from `navigationBar.js`.
 * 2. Import `setupButtonEffects` from `buttonEffects.js`.
 * 3. If `document.readyState` is not `"loading"`,
 *    call `populateNavbar` and `setupButtonEffects` immediately.
 * 4. Otherwise, listen for the `DOMContentLoaded` event and call them then.
 */
import { populateNavbar } from "./navigationBar.js";
import { setupButtonEffects } from "./buttonEffects.js";

function init() {
  populateNavbar();
  setupButtonEffects();
}

if (document.readyState !== "loading") {
  init();
} else {
  document.addEventListener("DOMContentLoaded", init);
}
