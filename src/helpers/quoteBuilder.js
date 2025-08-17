/**
 * Fetches Aesop's Fables story and metadata from JSON files and merges them.
 *
 * @pseudocode
 * 1. Send GET requests to retrieve both `aesopsFables.json` and
 *    `aesopsMeta.json` using the `fetch` API.
 *    - Await both responses concurrently.
 *
 * 2. Verify the response status for each request:
 *    - Check that `response.ok` is `true` for both files.
 *    - If either response fails, throw an error with a descriptive message.
 *
 * 3. Parse the JSON responses:
 *    - Convert both response bodies into JavaScript objects using `response.json()`.
 *
 * 4. Merge the metadata with the corresponding story using the shared `id`.
 *
 * 5. Return the combined array of fables.
 *
 * @returns {Promise<Object[]>} A promise that resolves to an array of fables.
 * @throws {Error} If the fetch request fails or the response is not successful.
 */
import { DATA_DIR } from "./constants.js";
import { seededRandom } from "./testModeUtils.js";
import { escapeHTML } from "./utils.js";

/**
 * @typedef {Object} QuoteLoadState
 * @property {boolean} kgImageLoaded
 * @property {boolean} quoteLoaded
 */

/**
 * Removes fade-in once the KG image and quote have loaded.
 *
 * @param {QuoteLoadState} state
 */
function checkAssetsReady(state) {
  if (state.kgImageLoaded && state.quoteLoaded) {
    document.querySelector(".kg-sprite img")?.classList.remove("fade-in");
    document.querySelector(".quote-block")?.classList.remove("fade-in");
  }
}

async function fetchFables() {
  const [storyRes, metaRes] = await Promise.all([
    fetch(`${DATA_DIR}aesopsFables.json`),
    fetch(`${DATA_DIR}aesopsMeta.json`)
  ]);

  if (!storyRes.ok || !metaRes.ok) {
    throw new Error("Failed to fetch Aesop's fables data");
  }

  const [stories, metadata] = await Promise.all([storyRes.json(), metaRes.json()]);

  const metaMap = new Map(metadata.map((m) => [m.id, m]));
  return stories.map((story) => ({ ...story, ...(metaMap.get(story.id) || {}) }));
}

/**
 * Formats a fable's story by replacing newline characters with HTML tags for proper rendering.
 *
 * @pseudocode
 * 1. Coerce the story to a string.
 *
 * 2. Normalize newline characters:
 *    - Replace escaped newline characters (`\\n`) with actual newline characters (`\n`).
 *
 * 3. Split the story into paragraphs:
 *    - Use `.split(/\n{2,}/)` to divide the story into paragraphs based on double or more consecutive newlines.
 *    - Trim each paragraph and filter out empty paragraphs.
 *
 * 4. Format each paragraph:
 *    - Wrap each paragraph in `<p>` tags.
 *    - Replace single newline characters (`\n`) within paragraphs with `<br>` tags for line breaks.
 *
 * 5. Combine formatted paragraphs:
 *    - Join the paragraphs into a single HTML string.
 *
 * 6. Return the formatted story.
 *
 * @param {string} story - The fable's story text to format.
 * @returns {string} The formatted story with HTML tags for rendering.
 */
export function formatFableStory(story) {
  story = String(story ?? "").replace(/\\n/g, "\n");

  return story
    .trim()
    .split(/\n{2,}/) // Split on 2+ newlines
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p><br>`)
    .join("");
}

/**
 * Renders the provided fable inside the `#quote` element.
 *
 * @param {Object} fable
 */
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

/**
 * Renders a fallback message inside the `#quote` element.
 */
function renderFallback() {
  const quoteDiv = document.getElementById("quote");
  if (quoteDiv) {
    quoteDiv.innerHTML = "<p>Take a breath. Even a still pond reflects the sky.</p>";
  }
}

/**
 * Displays a fable in the designated quote div on the page.
 *
 * @pseudocode
 * 1. Reference the cached quote and loader elements:
 *    - `quoteDiv` and `loaderDiv` are module-level references to `#quote` and `#quote-loader`.
 *
 * 2. Ensure the DOM elements exist:
 *    - If either element is missing, exit early.
 *
 * 3. Check if a fable is provided:
 *    - If a fable is provided:
 *      a. Format the fable's story using `formatFableStory`.
 *      b. Update the quote div's inner HTML with the fable's title and formatted story.
 *    - If no fable is provided:
 *      a. Display a default congratulatory message in the quote div.
 *
 * 4. Update the quote div:
 *    - Use template literals to dynamically insert the fable's title and story into the HTML structure.

 * 5. Toggle visibility:
 *    - Hide the loader element and remove the `hidden` class from the quote element.
 *
 * @param {Object|null} fable - The fable object containing the title and story, or `null` if no fable is available.
 */
function displayFable(fable) {
  const quoteDiv = document.getElementById("quote");
  const loaderDiv = document.getElementById("quote-loader");
  if (!quoteDiv || !loaderDiv) {
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
}

/**
 * Displays a random quote from Aesop's Fables in the designated quote div.
 *
 * @pseudocode
 * 1. Fetch the fables data.
 * 2. Select a random fable using `seededRandom`.
 * 3. Render the fable or a fallback message via `displayFable`.
 * 4. Mark `quoteLoaded` on the provided state and call `checkAssetsReady`.
 *
 * @throws {Error} If fetching the fables data fails.
 */
async function displayRandomQuote(state) {
  try {
    const fables = await fetchFables();
    const maxId = Math.max(...fables.map((fable) => fable.id));
    const randomId = Math.floor(seededRandom() * maxId) + 1;
    const randomFable = fables.find((fable) => fable.id === randomId);
    displayFable(randomFable);
  } catch (error) {
    console.error("Error fetching or displaying the fable:", error);
    displayFable(null);
  } finally {
    state.quoteLoaded = true;
    checkAssetsReady(state);
  }
}

/**
 * Waits for the KG sprite image to load, updating the load state accordingly.
 *
 * @pseudocode
 * 1. Query `.kg-sprite img`.
 * 2. If the image doesn't exist or is already complete, update state and check assets.
 * 3. Otherwise, await the `load` event before updating state and checking assets.
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
 * 2. Await `displayRandomQuote(state)` to render the quote.
 * 3. Await `waitForKgImage(state)` to handle the KG sprite image.
 *
 * @returns {Promise<void>} Promise that resolves once the quote is displayed.
 */
export async function loadQuote() {
  const state = { kgImageLoaded: false, quoteLoaded: false };
  await displayRandomQuote(state);
  await waitForKgImage(state);
}
