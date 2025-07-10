/**
 * Initialize the Meditation page.
 *
 * @pseudocode
 * 1. Import `setupLanguageToggle` from `pseudoJapanese.js`.
 * 2. Define `setupMeditationPage` which:
 *    a. Retrieves the quote element from the DOM.
 *    b. Calls `setupLanguageToggle` with the quote element.
 * 3. Run `setupMeditationPage` after the DOM is loaded.
 */
import { setupLanguageToggle } from "./pseudoJapanese.js";

export function setupMeditationPage() {
  const quoteEl = document.getElementById("quote");
  setupLanguageToggle(quoteEl);
}

if (document.readyState !== "loading") {
  setupMeditationPage();
} else {
  document.addEventListener("DOMContentLoaded", setupMeditationPage);
}
