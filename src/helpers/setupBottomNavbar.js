/**
 * Initialize the bottom navigation bar and button effects when the DOM is ready.
 *
 * @pseudocode
 * 1. Import `populateNavbar` from `navigationBar.js`.
 * 2. Import `setupButtonEffects` from `buttonEffects.js`.
 * 3. Define `init` to call `populateNavbar` and `setupButtonEffects`.
 * 4. Use `onDomReady` to invoke `init` when the DOM is ready.
 */
import { populateNavbar } from "./navigationBar.js";
import { setupButtonEffects } from "./buttonEffects.js";
import { onDomReady } from "./domReady.js";

function init() {
  populateNavbar();
  setupButtonEffects();
}

onDomReady(init);
