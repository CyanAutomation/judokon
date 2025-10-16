/**
 * Bootstrap JU-DO-KON! once the DOM is ready.
 *
 * @pseudocode
 * 1. Listen for the `DOMContentLoaded` event.
 * 2. Invoke `initGame` to wire up the page.
 */
import { initGame } from "./game.js";
import { registerBrowseTestApi } from "./helpers/browse/testApi.js";

document.addEventListener("DOMContentLoaded", () => {
  registerBrowseTestApi();
  initGame().catch(console.error);
});
