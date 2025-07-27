import { onDomReady } from "./domReady.js";
import { findMatches } from "./vectorSearch.js";
// Load Transformers.js dynamically from jsDelivr when first used
// This avoids bundling the large library with the rest of the code.

let extractor;
let spinner;

const SIMILARITY_THRESHOLD = 0.6;

/**
 * Load the MiniLM feature extractor on first use.
 *
 * @pseudocode
 * 1. Return the cached `extractor` when available.
 * 2. Dynamically import the Transformers.js `pipeline` helper.
 * 3. Instantiate a feature-extraction pipeline with the MiniLM model and store it.
 *    - On failure, log the error, reset `extractor` to `null`, and rethrow.
 * 4. Return the initialized `extractor`.
 *
 * @returns {Promise<any>} The feature extraction pipeline instance.
 */
async function getExtractor() {
  if (!extractor) {
    try {
      const { pipeline } = await import(
        "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0/dist/transformers.min.js"
      );
      extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    } catch (error) {
      console.error("Model failed to load", error);
      extractor = null;
      throw error;
    }
  }
  return extractor;
}

/**
 * Handle the vector search form submission.
 *
 * @pseudocode
 * 1. Prevent the default form submission behavior.
 * 2. Read and trim the query from the input element; clear previous results.
 *    - Exit early if the query is empty.
 * 3. Show the spinner and a searching message.
 * 4. Obtain the extractor and generate the query vector using mean pooling.
 * 5. Use `findMatches` to fetch the top results for the vector.
 * 6. Split matches by `SIMILARITY_THRESHOLD` into strong and weak groups.
 * 7. Hide the spinner and handle empty or missing embeddings cases.
 * 8. Build an ordered list. When no strong matches exist, show a warning and
 *    display up to three weak matches.
 * 9. On error, log the issue, hide the spinner, and display a fallback message.
 *
 * @param {Event} event - The submit event from the form.
 */
async function handleSearch(event) {
  event.preventDefault();
  const input = document.getElementById("vector-search-input");
  const resultsEl = document.getElementById("search-results");
  const query = input.value.trim();
  resultsEl.textContent = "";
  if (!query) return;
  spinner.style.display = "block";
  resultsEl.textContent = "Searching...";
  try {
    const model = await getExtractor();
    const vector = await model(query, { pooling: "mean" });
    const matches = await findMatches(Array.from(vector), 5);
    resultsEl.textContent = "";
    spinner.style.display = "none";
    if (matches === null) {
      resultsEl.textContent = "Embeddings could not be loaded – please check console.";
      return;
    }
    if (matches.length === 0) {
      resultsEl.textContent = "No close matches found — refine your query.";
      return;
    }

    const strongMatches = matches.filter((m) => m.score >= SIMILARITY_THRESHOLD);
    const weakMatches = matches.filter((m) => m.score < SIMILARITY_THRESHOLD);

    const list = document.createElement("ol");
    const toRender = strongMatches.length > 0 ? strongMatches : weakMatches.slice(0, 3);

    if (strongMatches.length === 0) {
      const warning = document.createElement("p");
      warning.textContent =
        "\u26A0\uFE0F No strong matches found, but here are the closest matches based on similarity.";
      resultsEl.appendChild(warning);
    }

    for (const match of toRender) {
      const li = document.createElement("li");
      li.innerHTML = `<p>${match.text}</p><p class="small-text">Source: ${match.source} (score: ${match.score.toFixed(2)})</p>`;
      list.appendChild(li);
    }
    resultsEl.appendChild(list);
  } catch (err) {
    console.error("Search failed", err);
    spinner.style.display = "none";
    resultsEl.textContent = "An error occurred while searching.";
  }
}

/**
 * Initialize event handlers for the Vector Search page.
 *
 * @pseudocode
 * 1. Cache the spinner element and hide it if present.
 * 2. Locate the search form element.
 * 3. Attach `handleSearch` to the form's submit event.
 * 4. Intercept the Enter key to trigger form submission programmatically.
 */
function init() {
  spinner = document.getElementById("search-spinner");
  if (spinner) spinner.style.display = "none";
  const form = document.getElementById("vector-search-form");
  form?.addEventListener("submit", handleSearch);
  form?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      form.requestSubmit();
    }
  });
}

onDomReady(init);
