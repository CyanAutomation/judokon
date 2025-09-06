import { onDomReady } from "./domReady.js";
import vectorSearch from "./vectorSearch/index.js";
import { markdownToHtml } from "./markdownToHtml.js";
import { fetchJson } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";
import { prepareSearchUi, getSelectedTags } from "./vectorSearchPage/queryUi.js";
import { renderResults } from "./vectorSearchPage/renderResults.js";
import { preloadExtractor } from "./api/vectorSearchPage.js";
import { getSanitizer } from "./sanitizeHtml.js";
import { createSpinner } from "../components/Spinner.js";
import { buildQueryVector } from "./vectorSearchPage/buildQueryVector.js";
import { selectTopMatches } from "./vectorSearchPage/selectTopMatches.js";
import { applyResultsState } from "./vectorSearchPage/resultsState.js";

let spinner;
let resolveResultsPromise;
window.vectorSearchResultsPromise = Promise.resolve();

/**
 * Load surrounding context for a search result element.
 *
 * @pseudocode
 * 1. Ignore the request when context has already loaded.
 * 2. Retrieve the result id from the element's dataset.
 * 3. Find the child live region and announce loading.
 * 4. Fetch neighboring context using `fetchContextById` inside a try block.
 * 5. Verify `chunks` is an array; join to Markdown and sanitize the HTML.
 *    When `chunks` is missing or empty, show a fallback message.
 * 6. On failure, log the error and show a safe fallback message.
 * 7. Mark the element as expanded when complete.
 *
 * @param {HTMLElement} el - The result list item.
 */
async function loadResultContext(el) {
  if (el.dataset.loaded === "true") return;
  const id = el.dataset.id;
  const live = el.querySelector(".result-context");
  if (!live) return;
  live.textContent = "Loading context...";
  try {
    const chunks = await vectorSearch.fetchContextById(id, 1);
    if (Array.isArray(chunks)) {
      const markdown = chunks.join("\n\n");
      if (markdown.length > 0) {
        const DOMPurify = await getSanitizer();
        live.innerHTML = DOMPurify.sanitize(markdownToHtml(markdown));
      } else {
        live.textContent = "No additional context found.";
      }
    } else {
      live.textContent = "No additional context found.";
    }
    el.dataset.loaded = "true";
    el.setAttribute("aria-expanded", "true");
  } catch (err) {
    console.error("Failed to load context", err);
    live.textContent = "Context could not be loaded.";
  }
}

/**
 * Handle the vector search form submission.
 *
 * @pseudocode
 * 1. Prevent the default form submission behavior.
 * 2. Prepare the search UI and extract the trimmed query.
 *    - Exit early when the query is empty.
 * 3. Show the spinner and searching message.
 * 4. Build the query vector via `buildQueryVector` and fetch matches.
 * 5. Finalize the UI and exit early when matches are missing or empty.
 * 6. Render the results table through `renderSearchResults`.
 * 7. On error, log the issue, hide the spinner, and display a fallback message.
 *
 * @param {Event} event - The submit event from the form.
 */
/**
 * Handle the vector search form submission and orchestrate the UI flow.
 *
 * @summary Build a query vector, run the vector search, and render results.
 * @pseudocode
 * 1. Prevent default form submission and create a results promise.
 * 2. Prepare the UI and exit early if the query is empty.
 * 3. Show spinner and build a vector for the query.
 * 4. Call `vectorSearch.findMatches` with the vector and selected tags.
 * 5. Finalize the UI, handle no-match conditions, and render results.
 * 6. On error: log, hide spinner, show fallback message, and resolve the promise.
 *
 * @param {Event} event - Submit event from the search form.
 * @returns {Promise<void>}
 */
export async function handleSearch(event) {
  event.preventDefault();
  window.vectorSearchResultsPromise = new Promise((resolve) => {
    resolveResultsPromise = resolve;
  });
  const { query, tbody, messageEl } = prepareSearchUi();
  if (!query) {
    applyResultsState(spinner, messageEl, "results");
    resolveResultsPromise?.();
    return;
  }
  const selected = getSelectedTags();
  applyResultsState(spinner, messageEl, "loading");
  try {
    const { terms, vector } = await buildQueryVector(query);
    const matches = await vectorSearch.findMatches(vector, 5, selected, query);
    if (matches === null) {
      applyResultsState(
        spinner,
        messageEl,
        "error",
        "Embeddings could not be loaded – please check console."
      );
      resolveResultsPromise?.();
      return;
    }
    if (matches.length === 0) {
      applyResultsState(spinner, messageEl, "empty");
      resolveResultsPromise?.();
      return;
    }
    applyResultsState(spinner, messageEl, "results");
    renderSearchResults(tbody, messageEl, matches, terms);
  } catch (err) {
    console.error("Search failed", err);
    applyResultsState(spinner, messageEl, "error");
    resolveResultsPromise?.();
  }
}

/**
 * Render search results and display a warning when only weak matches exist.
 *
 * @pseudocode
 * 1. Partition matches with `selectTopMatches`.
 * 2. When no strong matches exist, show a warning message.
 * 3. Render the selected matches and attach context loaders.
 *
 * @param {HTMLElement} tbody - Table body element.
 * @param {HTMLElement} messageEl - Message display element.
 * @param {Array} matches - Matches returned from the search engine.
 * @param {string[]} terms - Tokenized query terms for highlighting.
 */
function renderSearchResults(tbody, messageEl, matches, terms) {
  const { strongMatches, toRender } = selectTopMatches(matches);
  if (strongMatches.length === 0 && messageEl) {
    messageEl.textContent =
      "\u26A0\uFE0F No strong matches found, but here are the closest matches based on similarity.";
    messageEl.classList.add("search-result-empty");
  }
  renderResults(tbody, toRender, terms, loadResultContext);
  queueMicrotask(() => resolveResultsPromise?.());
}

/**
 * Initialize event handlers for the Vector Search page.
 *
 * @pseudocode
 * 1. Begin preloading the feature extractor.
 * 2. Create a spinner and hide it initially.
 * 3. Locate the search form element.
 * 4. Attempt to load embeddings and metadata together.
 *    - On failure, hide the spinner, show an error message, attach form handlers, and exit early.
 * 5. Populate the tag filter dropdown with unique tags.
 * 6. Display the embedding count in the header.
 * 7. Attach `handleSearch` to the form and intercept Enter key submissions.
 */
/**
 * Initialize the Vector Search page: preload models, load embeddings, and wire UI handlers.
 *
 * @summary Preload extractor, load embedding data and metadata, populate UI, and attach handlers.
 * @pseudocode
 * 1. Preload extractor to reduce first-call latency.
 * 2. Create spinner and locate form/message elements.
 * 3. Attempt to load embeddings and metadata in parallel.
 *    - On failure: hide spinner, show error, attach handlers and exit.
 * 4. Warn on version mismatches, populate tag filters, update stats, and attach handlers.
 *
 * @returns {Promise<void>}
 */
export async function init() {
  preloadExtractor();
  const container = document.querySelector(".vector-search-container") || document.body;
  spinner = createSpinner(container);
  const form = document.getElementById("vector-search-form");
  const messageEl = document.getElementById("search-results-message");

  let embeddings;
  let meta;
  try {
    [embeddings, meta] = await Promise.all([
      vectorSearch.loadEmbeddings(),
      fetchJson(`${DATA_DIR}client_embeddings.meta.json`).catch(() => null)
    ]);
  } catch (err) {
    console.error("Embedding load failed", err);
    spinner.hide();
    if (messageEl) {
      messageEl.textContent = "Failed to load search data. Please try again later.";
    }
    attachFormHandlers(form);
    return;
  }

  maybeWarnVersionMismatch(embeddings, meta, messageEl);
  populateTagFilter(embeddings);
  updateStats(meta);
  attachFormHandlers(form);
}

onDomReady(init);

function maybeWarnVersionMismatch(embeddings, meta, messageEl) {
  const entryMismatch = hasEntryVersionMismatch(embeddings);
  const metaMismatch = hasMetaMismatch(meta);
  const mismatch = entryMismatch || metaMismatch;
  if (mismatch && messageEl) {
    let warningEl = messageEl.querySelector(".embedding-warning");
    if (!warningEl) {
      warningEl = document.createElement("div");
      warningEl.className = "embedding-warning";
      messageEl.appendChild(warningEl);
    }
    warningEl.textContent = "⚠️ Embedding data is out of date. Run npm run generate:embeddings.";
  }
}

function hasEntryVersionMismatch(embeddings) {
  if (!Array.isArray(embeddings)) return false;
  let mismatch = false;
  for (const entry of embeddings) {
    if (entry.version !== vectorSearch.CURRENT_EMBEDDING_VERSION) {
      mismatch = true;
      console.debug(
        `Embedding ${entry.id ?? "(unknown id)"} has version ${entry.version}; expected ${vectorSearch.CURRENT_EMBEDDING_VERSION}`
      );
    }
  }
  return mismatch;
}

function hasMetaMismatch(meta) {
  if (!meta) return false;
  if (meta.version !== vectorSearch.CURRENT_EMBEDDING_VERSION) {
    console.debug(
      `Embedding metadata version ${meta.version} does not match ${vectorSearch.CURRENT_EMBEDDING_VERSION}`
    );
    return true;
  }
  return false;
}

/**
 * Escape HTML special characters in a string.
 *
 * @pseudocode
 * 1. Define a mapping for `&`, `<`, `>`, `"`, and `'` to their HTML entities.
 * 2. Replace occurrences of those characters using the mapping.
 * 3. Return the escaped string.
 *
 * @param {string} str - Raw input string.
 * @returns {string} Escaped string safe for HTML contexts.
 */
function escapeHtml(str) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };
  return str.replace(/[&<>"']/g, (ch) => map[ch]);
}

function populateTagFilter(embeddings) {
  const tagSelect = document.getElementById("tag-filter");
  if (!tagSelect || !Array.isArray(embeddings)) return;
  const tags = new Set();
  embeddings.forEach((e) => {
    if (Array.isArray(e.tags)) e.tags.forEach((t) => tags.add(t));
  });
  tagSelect.innerHTML =
    '<option value="all">All</option>' +
    [...tags]
      .sort()
      .map((t) => {
        const esc = escapeHtml(t);
        return `<option value="${esc}">${esc}</option>`;
      })
      .join("");
}

function updateStats(meta) {
  const statsEl = document.getElementById("embedding-stats");
  if (statsEl && meta && typeof meta.count === "number") {
    statsEl.textContent = `${meta.count} embeddings loaded`;
  }
}

function attachFormHandlers(form) {
  form?.addEventListener("submit", handleSearch);
  form?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      form.requestSubmit();
    }
  });
}
