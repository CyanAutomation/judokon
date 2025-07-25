/**
 * Initialize the Meditation page.
 *
 * @pseudocode
 * 1. Import `setupLanguageToggle` from `pseudoJapanese.js`.
 * 2. Define `setupMeditationPage` which:
 *    a. Retrieves the quote element from the DOM.
 *    b. Calls `setupLanguageToggle` with the quote element.
 * 3. Use `onDomReady` to run `setupMeditationPage` once the DOM is ready.
 */
import { setupLanguageToggle } from "./pseudoJapanese.js";
import { onDomReady } from "./domReady.js";
import { initTooltips } from "./tooltip.js";

export function setupMeditationPage() {
  const quoteEl = document.getElementById("quote");
  setupLanguageToggle(quoteEl);
  initTooltips();
}

onDomReady(setupMeditationPage);
