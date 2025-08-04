/**
 * Initialize the Meditation page.
 *
 * @pseudocode
 * 1. Import `setupLanguageToggle` from `pseudoJapanese.js` and `loadQuote` from `quoteBuilder.js`.
 * 2. Define `setupMeditationPage` which:
 *    a. Retrieves the quote element from the DOM.
 *    b. Calls `loadQuote` to display a random quote.
 *    c. Calls `setupLanguageToggle` with the quote element.
 *    d. Initializes tooltips.
 * 3. Use `onDomReady` to run `setupMeditationPage` once the DOM is ready.
 *
 * @returns {void}
 */
import { setupLanguageToggle } from "./pseudoJapanese.js";
import { onDomReady } from "./domReady.js";
import { initTooltips } from "./tooltip.js";
import { loadQuote } from "./quoteBuilder.js";

export function setupMeditationPage() {
  const quoteEl = document.getElementById("quote");
  loadQuote();
  setupLanguageToggle(quoteEl);
  initTooltips();
}

onDomReady(setupMeditationPage);
