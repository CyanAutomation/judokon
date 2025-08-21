import { displayRandomQuote } from "./quotes/quoteService.js";
import { displayFable, checkAssetsReady } from "./quotes/quoteRenderer.js";

/**
 * @typedef {Object} QuoteLoadState
 * @property {boolean} kgImageLoaded
 * @property {boolean} quoteLoaded
 */

/**
 * Waits for the KG sprite image to load, updating the load state accordingly.
 *
 * @pseudocode
 * 1. Query `.kg-sprite img`.
 * 2. If the image doesn't exist or is already complete, update state and call `checkAssetsReady`.
 * 3. Otherwise, await the `load` event before updating state and calling `checkAssetsReady`.
 *
 * @param {QuoteLoadState} state
 * @returns {Promise<void>}
 */
async function waitForKgImage(state) {
  const kgImg = document.querySelector(".kg-sprite img");
  if (!kgImg) {
    state.kgImageLoaded = true;
    checkAssetsReady(state);
    return;
  }

  if (kgImg.complete) {
    state.kgImageLoaded = true;
    checkAssetsReady(state);
    return;
  }

  await new Promise((resolve) => {
    kgImg.addEventListener(
      "load",
      () => {
        state.kgImageLoaded = true;
        checkAssetsReady(state);
        resolve();
      },
      { once: true }
    );
  });
}

/**
 * Initializes quote loading and handles KG sprite image readiness.
 *
 * @pseudocode
 * 1. Create a `QuoteLoadState` object.
 * 2. Await `displayRandomQuote()` to retrieve a random fable.
 * 3. Pass the fable and state to `displayFable` for rendering.
 * 4. Await `waitForKgImage(state)` to handle the KG sprite image.
 *
 * @returns {Promise<void>} Promise that resolves once the quote is displayed.
 */
export async function loadQuote() {
  const state = { kgImageLoaded: false, quoteLoaded: false };
  const fable = await displayRandomQuote();
  displayFable(fable, state);
  await waitForKgImage(state);
}
