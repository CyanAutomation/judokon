/**
 * Sets up the Meditation page by initializing tooltips.
 *
 * @summary This function orchestrates the initial rendering and interactive
 * elements of the meditation screen.
 *
 * @pseudocode
 * 1. Call `initTooltips()` to initialize any tooltips present on the page.
 *
 * @returns {void}
 */
import { onDomReady } from "./domReady.js";
import { initTooltips } from "./tooltip.js";

/**
 * Initialize the Meditation page UI and interactions.
 *
 * @summary Enables tooltips on the meditation page.
 *
 * @pseudocode
 * 1. Call `initTooltips()` to activate tooltips.
 *
 * @returns {void}
 */
export function setupMeditationPage() {
  initTooltips();
}

onDomReady(setupMeditationPage);
