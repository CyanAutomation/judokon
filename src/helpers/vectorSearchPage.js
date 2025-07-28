import { onDomReady } from "./domReady.js";
import { findMatches, fetchContextById, loadEmbeddings } from "./vectorSearch.js";
// Load Transformers.js dynamically from jsDelivr when first used
// This avoids bundling the large library with the rest of the code.

let extractor;
let spinner;

/**
 * Maximum number of characters to show before truncating match text.
 * @type {number}
 */
const SNIPPET_LIMIT = 200;

const SIMILARITY_THRESHOLD = 0.6;

/**
 * Score difference threshold for strong matches.
 * When the top score exceeds the second best by more than this value,
 * only the highest scoring result is shown.
 * @type {number}
 */
const DROP_OFF_THRESHOLD = 0.4;

/**
 * Select matches to render based on similarity scores.
 *
 * @param {Array<{score:number}>} strongMatches - Results meeting the similarity threshold.
 * @param {Array<{score:number}>} weakMatches - Results below the threshold.
 * @returns {Array} Matches chosen for display.
 */
export function selectMatches(strongMatches, weakMatches) {
  if (strongMatches.length > 0) {
    if (
      strongMatches.length > 1 &&
      strongMatches[0].score - strongMatches[1].score > DROP_OFF_THRESHOLD
    ) {
      return [strongMatches[0]];
    }
    return strongMatches;
  }
  return weakMatches.slice(0, 3);
}

/**
 * Load surrounding context for a search result element.
 *
 * @pseudocode
 * 1. Ignore the request when context has already loaded.
 * 2. Retrieve the result id from the element's dataset.
 * 3. Find the child live region and announce loading.
 * 4. Fetch neighboring context using `fetchContextById`.
 * 5. Insert the joined chunks into the live region or a fallback message.
 * 6. Mark the element as expanded when complete.
 *
 * @param {HTMLElement} el - The result list item.
 */
async function loadResultContext(el) {
  if (el.dataset.loaded === "true") return;
  const id = el.dataset.id;
  const live = el.querySelector(".result-context");
  if (!live) return;
  live.textContent = "Loading context...";
  const chunks = await fetchContextById(id, 1);
  live.textContent = chunks.join("\n\n") || "No additional context found.";
  el.dataset.loaded = "true";
  el.setAttribute("aria-expanded", "true");
}

/**
 * Load the MiniLM feature extractor on first use.
 *
 * @pseudocode
 * 1. Return the cached `extractor` when available.
 * 2. Dynamically import the Transformers.js `pipeline` helper.
 * 3. Instantiate a quantized feature-extraction pipeline with the MiniLM model
 *    and store it.
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
      extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
        quantized: true
      });
    } catch (error) {
      console.error("Model failed to load", error);
      extractor = null;
      throw error;
    }
  }
  return extractor;
}

/**
 * Format a file path string for display in the Source column.
 * Each path segment appears on a new line.
 *
 * @param {string} source - File path like "design/foo/bar.md".
 * @returns {DocumentFragment} Fragment with line breaks between segments.
 */
export function formatSourcePath(source) {
  const fragment = document.createDocumentFragment();
  source.split("/").forEach((part, idx, arr) => {
    const span = document.createElement("span");
    span.textContent = part;
    fragment.appendChild(span);
    if (idx < arr.length - 1) {
      fragment.appendChild(document.createElement("br"));
    }
  });
  return fragment;
}

/**
 * Format tag arrays for display.
 *
 * @param {string[]} tags - Tag names.
 * @returns {string} Comma separated tag string.
 */
export function formatTags(tags) {
  return Array.isArray(tags) ? tags.join(", ") : "";
}

/**
 * Build a snippet element with optional truncation.
 *
 * @pseudocode
 * 1. Create a container and span for the snippet text.
 * 2. When `text` exceeds `SNIPPET_LIMIT`, append an ellipsis and a
 *    "Show more" button that toggles the full content.
 *    - Update the button label to "Show less" when expanded.
 *    - Prevent the toggle from triggering row click events.
 * 3. Return the container element.
 *
 * @param {string} text - The full match text.
 * @returns {HTMLElement} Snippet DOM element.
 */
function createSnippetElement(text) {
  const container = document.createElement("div");
  const span = document.createElement("span");
  const needsTruncate = text.length > SNIPPET_LIMIT;
  const shortText = needsTruncate ? text.slice(0, SNIPPET_LIMIT).trimEnd() + "\u2026" : text;
  span.textContent = shortText;
  container.appendChild(span);
  if (needsTruncate) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.classList.add("show-more-btn");
    btn.textContent = "Show more";
    btn.setAttribute("aria-expanded", "false");
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const expanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", expanded ? "false" : "true");
      span.textContent = expanded ? shortText : text;
      btn.textContent = expanded ? "Show more" : "Show less";
    });
    container.appendChild(document.createTextNode(" "));
    container.appendChild(btn);
  }
  return container;
}

/**
 * Handle the vector search form submission.
 *
 * @pseudocode
 * 1. Prevent the default form submission behavior.
 * 2. Read and trim the query from the input element; clear previous results.
 *    - Exit early if the query is empty.
 * 3. Show the spinner and a searching message.
 * 4. Obtain the extractor and generate the query vector using mean pooling,
 *    converting the result to a plain array.
 * 5. Use `findMatches` to fetch the top results for the vector.
 * 6. Split matches by `SIMILARITY_THRESHOLD` into strong and weak groups.
 *    - When multiple strong matches exist, compare the top two scores and keep
 *      only the first when the difference exceeds `DROP_OFF_THRESHOLD`.
 * 7. Hide the spinner and handle empty or missing embeddings cases.
 * 8. Build a results table. When no strong matches exist, show a warning and
 *    display up to three weak matches.
 * 9. Attach handlers to load surrounding context on result activation.
 * 10. On error, log the issue, hide the spinner, and display a fallback message.
 *
 * @param {Event} event - The submit event from the form.
 */
async function handleSearch(event) {
  event.preventDefault();
  const input = document.getElementById("vector-search-input");
  const table = document.getElementById("vector-results-table");
  const tbody = table?.querySelector("tbody");
  const query = input.value.trim();
  if (tbody) tbody.textContent = "";
  if (!query) return;
  const messageEl = document.getElementById("search-results-message");
  spinner.style.display = "block";
  if (messageEl) messageEl.textContent = "Searching...";
  try {
    const model = await getExtractor();
    const result = await model(query, { pooling: "mean" });
    const vector = Array.from(result.data ?? result);
    const matches = await findMatches(vector, 5, [], query);
    if (messageEl) messageEl.textContent = "";
    spinner.style.display = "none";
    if (matches === null) {
      if (messageEl)
        messageEl.textContent = "Embeddings could not be loaded – please check console.";
      return;
    }
    if (matches.length === 0) {
      if (messageEl) messageEl.textContent = "No close matches found — refine your query.";
      return;
    }

    const strongMatches = matches.filter((m) => m.score >= SIMILARITY_THRESHOLD);
    const weakMatches = matches.filter((m) => m.score < SIMILARITY_THRESHOLD);

    const toRender = selectMatches(strongMatches, weakMatches);

    if (strongMatches.length === 0 && messageEl) {
      messageEl.textContent =
        "\u26A0\uFE0F No strong matches found, but here are the closest matches based on similarity.";
    }

    for (const match of toRender) {
      const row = document.createElement("tr");
      row.classList.add("search-result-item");
      row.dataset.id = match.id;
      row.setAttribute("role", "button");
      row.tabIndex = 0;
      row.setAttribute("aria-expanded", "false");

      const textCell = document.createElement("td");
      textCell.classList.add("match-text");
      const snippet = createSnippetElement(match.text);
      textCell.appendChild(snippet);
      if (match.qaContext) {
        const qa = document.createElement("div");
        qa.classList.add("qa-context", "small-text");
        qa.textContent = match.qaContext;
        textCell.appendChild(qa);
      }
      const context = document.createElement("div");
      context.classList.add("result-context", "small-text");
      context.setAttribute("aria-live", "polite");
      textCell.appendChild(context);

      const sourceCell = document.createElement("td");
      sourceCell.appendChild(formatSourcePath(match.source));

      const tagsCell = document.createElement("td");
      tagsCell.textContent = formatTags(match.tags);

      const scoreCell = document.createElement("td");
      scoreCell.textContent = match.score.toFixed(2);

      row.append(textCell, sourceCell, tagsCell, scoreCell);
      row.addEventListener("click", () => loadResultContext(row));
      row.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          loadResultContext(row);
        }
      });
      tbody?.appendChild(row);
    }
  } catch (err) {
    console.error("Search failed", err);
    spinner.style.display = "none";
    if (messageEl) messageEl.textContent = "An error occurred while searching.";
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
 * 5. Results items load additional context when activated.
 */
function init() {
  spinner = document.getElementById("search-spinner");
  if (spinner) spinner.style.display = "none";
  // Preload embeddings on page load so search runs instantly
  loadEmbeddings();
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
