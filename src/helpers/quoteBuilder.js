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
import { shouldEnableTypewriter, runTypewriterEffect } from "./typewriter.js";

let kgImageLoaded = false;
let quoteLoaded = false;

function checkAssetsReady() {
  if (kgImageLoaded && quoteLoaded) {
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
 * 1. Normalize newline characters:
 *    - Replace escaped newline characters (`\\n`) with actual newline characters (`\n`).
 *
 * 2. Split the story into paragraphs:
 *    - Use `.split(/\n{2,}/)` to divide the story into paragraphs based on double or more consecutive newlines.
 *    - Trim each paragraph and filter out empty paragraphs.
 *
 * 3. Format each paragraph:
 *    - Wrap each paragraph in `<p>` tags.
 *    - Replace single newline characters (`\n`) within paragraphs with `<br>` tags for line breaks.
 *
 * 4. Combine formatted paragraphs:
 *    - Join the paragraphs into a single HTML string.
 *
 * 5. Return the formatted story.
 *
 * @param {string} story - The fable's story text to format.
 * @returns {string} The formatted story with HTML tags for rendering.
 */
function formatFableStory(story) {
  story = story.replace(/\\n/g, "\n");

  return story
    .trim()
    .split(/\n{2,}/) // Split on 2+ newlines
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p><br>`)
    .join("");
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
 * 6. If the typewriter effect setting is enabled:
 *    - Run the typewriter animation on `#quote-content` and restore the HTML when complete.
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
    const formattedStory = formatFableStory(fable.story);
    quoteDiv.innerHTML = `
      <div class="quote-heading" id="quote-heading">${fable.title}</div>
      <div class="quote-content long-form" id="quote-content">${formattedStory}</div>
    `;
  } else {
    quoteDiv.innerHTML = "<p>Take a breath. Even a still pond reflects the sky.</p>";
  }
  loaderDiv.classList.add("hidden");
  quoteDiv.classList.remove("hidden");
  if (shouldEnableTypewriter()) {
    const contentEl = document.getElementById("quote-content");
    runTypewriterEffect(contentEl, quoteDiv.querySelector("#quote-content")?.innerHTML || "");
  }
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
 * 1. Fetch the fables data:
 *    - Call `fetchFables` to retrieve the JSON data containing Aesop's Fables.
 *    - Handle any errors that occur during the fetch process.
 *
 * 2. Select a random fable:
 *    - Determine the maximum ID from the fables data.
 *    - Generate a random ID within the range of available IDs.
 *    - Find the fable corresponding to the random ID.
 *
 * 3. Display the fable:
 *    - If a fable is found, pass it to `displayFable` to update the quote div.
 *    - If no fable is found or an error occurs, pass `null` to `displayFable` to display a default message.
 *
 * 4. Automatically call the function when the DOM is fully loaded:
 *    - Use the `DOMContentLoaded` event to ensure the function runs after the DOM is ready.
 * 5. When both the KG image and quote have loaded:
 *    - Remove the `fade-in` class from the image and quote container so they fade into view.
 *
 * @throws {Error} If fetching the fables data fails.
 */
async function displayRandomQuote() {
  try {
    const fables = await fetchFables();
    const maxId = Math.max(...fables.map((fable) => fable.id));
    const randomId = Math.floor(Math.random() * maxId) + 1;
    const randomFable = fables.find((fable) => fable.id === randomId);
    displayFable(randomFable);
  } catch (error) {
    console.error("Error fetching or displaying the fable:", error);
    displayFable(null);
  } finally {
    quoteLoaded = true;
    checkAssetsReady();
  }
}

// Automatically call displayRandomQuote when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  const kgImg = document.querySelector(".kg-sprite img");
  if (kgImg) {
    if (kgImg.complete) {
      kgImageLoaded = true;
      checkAssetsReady();
    } else {
      kgImg.addEventListener("load", () => {
        kgImageLoaded = true;
        checkAssetsReady();
      });
    }
  }
  displayRandomQuote();
});
