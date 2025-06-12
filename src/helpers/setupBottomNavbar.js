/**
 * Initialize the bottom navigation bar when the DOM is ready.
 *
 * @pseudocode
 * 1. Import `populateNavbar` from `bottomNavigation.js`.
 * 2. Listen for the `DOMContentLoaded` event.
 * 3. Call `populateNavbar` once the event fires.
 */
import { populateNavbar } from "./bottomNavigation.js";

document.addEventListener("DOMContentLoaded", () => {
  populateNavbar();
});
