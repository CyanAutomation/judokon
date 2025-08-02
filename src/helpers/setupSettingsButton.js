/**
 * Attach navigation behavior to the settings button.
 *
 * @pseudocode
 * 1. Locate the `#settings-button` element.
 * 2. Guard: exit if the element is missing.
 * 3. Add a click listener that navigates to `settings.html`.
 */
import { onDomReady } from "./domReady.js";

function init() {
  const button = document.getElementById("settings-button");
  if (!button) return;
  button.addEventListener("click", () => {
    window.location.href = "settings.html";
  });
}

onDomReady(init);
