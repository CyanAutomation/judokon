/**
 * Initialize the bottom navigation bar and button effects when the DOM is ready.
 *
 * @pseudocode
 * 1. Import `populateNavbar` from `bottomNavigation.js`.
 * 2. Import `setupButtonEffects` from `buttonEffects.js`.
 * 3. Listen for the `DOMContentLoaded` event.
 * 4. Call `populateNavbar` and `setupButtonEffects` once the event fires.
 */
import { populateNavbar } from "./bottomNavigation.js";
import { setupButtonEffects } from "./buttonEffects.js";

document.addEventListener("DOMContentLoaded", () => {
  populateNavbar();
  setupButtonEffects();
});
