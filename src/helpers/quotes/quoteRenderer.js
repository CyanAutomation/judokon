/**
 * Handles DOM rendering for Aesop's Fables quotes.
 *
 * @module quoteRenderer
 */
import { escapeHTML } from "../utils.js";

/**
 * @typedef {Object} QuoteLoadState
 * @property {boolean} kgImageLoaded
 * @property {boolean} quoteLoaded
 */

/**
 * Removes fade-in once the KG image and quote have loaded.
 *
 * @pseudocode
 * 1. If `kgImageLoaded` and `quoteLoaded` are both true:
 *    a. Remove `fade-in` from `.kg-sprite img`.
 *    b. Remove `fade-in` from `.quote-block`.
 *
 * @param {QuoteLoadState} state
 * @returns {void}
 */
export function checkAssetsReady(state) {
  if (state.kgImageLoaded && state.quoteLoaded) {
    document.querySelector(".kg-sprite img")?.classList.remove("fade-in");
    document.querySelector(".quote-block")?.classList.remove("fade-in");
  }
}

/**
 * Formats a fable's story by replacing newline characters with HTML tags for proper rendering.
 *
 * @pseudocode
 * 1. Coerce the story to a string.
 * 2. Normalize newline characters by replacing escaped `\n` with actual newlines.
 * 3. Split the story into paragraphs on two or more newlines.
 * 4. Trim and filter out empty paragraphs.
 * 5. Wrap each paragraph in `<p>` and replace single newlines with `<br>`.
 * 6. Join the paragraphs into a single HTML string and return it.
 *
 * @param {string} story - The fable's story text to format.
 * @returns {string} The formatted story with HTML tags for rendering.
 */
export function formatFableStory(story) {
  story = String(story ?? "").replace(/\\n/g, "\n");

  return story
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p><br>`)
    .join("");
}

function renderQuote(fable) {
  const quoteDiv = document.getElementById("quote");
  if (!quoteDiv) {
    return;
  }
  const formattedStory = formatFableStory(escapeHTML(fable.story));
  const safeTitle = escapeHTML(fable.title);
  quoteDiv.innerHTML = `
      <div class="quote-heading" id="quote-heading">${safeTitle}</div>
      <div class="quote-content long-form" id="quote-content">${formattedStory}</div>
    `;
}

function renderFallback() {
  const quoteDiv = document.getElementById("quote");
  if (quoteDiv) {
    quoteDiv.innerHTML = "<p>Take a breath. Even a still pond reflects the sky.</p>";
  }
}

/**
 * Renders the fable or a fallback message and updates load state.
 *
 * @pseudocode
 * 1. Query `#quote` and `#quote-loader` elements; exit if either is missing.
 * 2. Render the fable with `renderQuote` when provided; otherwise use `renderFallback`.
 * 3. Hide the loader and reveal the quote block.
 * 4. Reveal and focus the language toggle if it exists, updating live region text.
 * 5. Mark `quoteLoaded` on `state` and call `checkAssetsReady(state)`.
 *
 * @param {Object|null} fable - The fable object containing the title and story, or `null` if unavailable.
 * @param {QuoteLoadState} state
 * @returns {void}
 */
export function displayFable(fable, state) {
  const quoteDiv = document.getElementById("quote");
  const loaderDiv = document.getElementById("quote-loader");
  if (!quoteDiv || !loaderDiv) {
    state.quoteLoaded = true;
    checkAssetsReady(state);
    return;
  }

  if (fable) {
    renderQuote(fable);
  } else {
    renderFallback();
  }

  loaderDiv.classList.add("hidden");
  quoteDiv.classList.remove("hidden");
  const toggleBtn = document.getElementById("language-toggle");
  if (toggleBtn) {
    toggleBtn.classList.remove("hidden");
    toggleBtn.setAttribute("aria-live", "polite");
    toggleBtn.focus();
    const liveRegion = document.getElementById("language-announcement");
    if (liveRegion) {
      liveRegion.textContent = "language toggle available";
    }
  }
  state.quoteLoaded = true;
  checkAssetsReady(state);
}
