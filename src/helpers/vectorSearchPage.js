import { onDomReady } from "./domReady.js";
import vectorSearch from "./vectorSearch/index.js";
import { markdownToHtml } from "./markdownToHtml.js";
import { fetchJson } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";
import { prepareSearchUi, getSelectedTags } from "./vectorSearchPage/queryUi.js";
import { renderResults } from "./vectorSearchPage/renderResults.js";
import { getExtractor, SIMILARITY_THRESHOLD, preloadExtractor } from "./api/vectorSearchPage.js";

let spinner;

/**
 * Load surrounding context for a search result element.
 *
 * @pseudocode
 * 1. Ignore the request when context has already loaded.
 * 2. Retrieve the result id from the element's dataset.
 * 3. Find the child live region and announce loading.
 * 4. Fetch neighboring context using `fetchContextById`.
 * 5. Convert `chunks.join("\n\n")` from Markdown to HTML and insert it
 *    into the live region, or show a fallback message when empty.
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
  const chunks = await vectorSearch.fetchContextById(id, 1);
  const markdown = chunks.join("\n\n");
  live.innerHTML = markdown.length > 0 ? markdownToHtml(markdown) : "No additional context found.";
  el.dataset.loaded = "true";
  el.setAttribute("aria-expanded", "true");
}

/**
 * Expand the query and generate its vector representation.
 *
 * @pseudocode
 * 1. Split the original query into lowercase terms.
 * 2. Expand the query with domain-specific synonyms.
 * 3. Obtain the feature extractor and convert the expanded query into a vector.
 * 4. Return the original terms along with the resulting vector.
 *
 * @param {string} query - Raw query string from the user.
 * @returns {Promise<{terms: string[], vector: number[]}>} Processed query data.
 */
async function buildQueryVector(query) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const expanded = await vectorSearch.expandQueryWithSynonyms(query);
  const model = await getExtractor();
  const result = await model(expanded, { pooling: "mean" });
  const vector = Array.from(result.data ?? result);
  return { terms, vector };
}

/**
 * Select the matches to display and expose strong matches for messaging.
 *
 * @pseudocode
 * 1. Divide matches into strong and weak groups by `SIMILARITY_THRESHOLD`.
 * 2. If multiple strong matches exist and the score gap between the top two
 *    exceeds `DROP_OFF_THRESHOLD`, keep only the top match.
 * 3. If no strong matches, return the top three weak ones.
 * 4. Return both the strong list and the final selection.
 *
 * @param {Array<{score:number}>} matches - All matches sorted by score.
 * @returns {{strongMatches: Array, toRender: Array}} Partitioned selections.
 */
function selectTopMatches(matches) {
  const DROP_OFF_THRESHOLD = 0.4;
  const strongMatches = matches.filter((m) => m.score >= SIMILARITY_THRESHOLD);
  const weakMatches = matches.filter((m) => m.score < SIMILARITY_THRESHOLD);
  let toRender;
  if (
    strongMatches.length > 1 &&
    strongMatches[0].score - strongMatches[1].score > DROP_OFF_THRESHOLD
  ) {
    toRender = [strongMatches[0]];
  } else if (strongMatches.length > 0) {
    toRender = strongMatches;
  } else {
    toRender = weakMatches.slice(0, 3);
  }
  return { strongMatches, toRender };
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
 * 5. Read selected tags from the filter dropdown and
 *    pass them to `findMatches` when fetching results.
 * 6. Split matches by `SIMILARITY_THRESHOLD` into strong and weak groups.
 *    - When multiple strong matches exist, compare the top two scores and keep
 *      only the first when the difference exceeds the drop-off threshold.
 * 7. Hide the spinner and handle empty or missing embeddings cases.
 * 8. Build a results table, highlighting query terms in each snippet.
 *    - Add a `top-match` class to the first row and color-code the Score cell.
 *    - When no strong matches exist, show a warning and display up to three weak matches.
 * 9. Attach handlers to load surrounding context on result activation.
 * 10. On error, log the issue, hide the spinner, and display a fallback message.
 *
 * @param {Event} event - The submit event from the form.
 */
export async function handleSearch(event) {
  event.preventDefault();
  const { query, tbody, messageEl } = prepareSearchUi();
  if (!query) return;
  const selected = getSelectedTags();
  showSearching(messageEl);
  try {
    const { terms, vector } = await buildQueryVector(query);
    const matches = await vectorSearch.findMatches(vector, 5, selected, query);
    finalizeSearchUi(messageEl);
    if (handleNoMatches(matches, messageEl)) return;

    const { strongMatches, toRender } = selectTopMatches(matches);
    if (strongMatches.length === 0 && messageEl) {
      messageEl.textContent =
        "\u26A0\uFE0F No strong matches found, but here are the closest matches based on similarity.";
      messageEl.classList.add("search-result-empty");
    }
    renderResults(tbody, toRender, terms, loadResultContext);
  } catch (err) {
    console.error("Search failed", err);
    spinner.style.display = "none";
    if (messageEl) messageEl.textContent = "An error occurred while searching.";
  }
}

function showSearching(messageEl) {
  spinner.style.display = "block";
  if (messageEl) {
    messageEl.textContent = "Searching...";
    messageEl.classList.remove("search-result-empty");
  }
}

function finalizeSearchUi(messageEl) {
  if (messageEl) {
    messageEl.textContent = "";
    messageEl.classList.remove("search-result-empty");
  }
  spinner.style.display = "none";
}

function handleNoMatches(matches, messageEl) {
  if (matches === null) {
    if (messageEl) {
      messageEl.textContent = "Embeddings could not be loaded – please check console.";
    }
    return true;
  }
  if (matches.length === 0) {
    if (messageEl) {
      messageEl.textContent = "No close matches found — refine your query.";
      messageEl.classList.add("search-result-empty");
    }
    return true;
  }
  return false;
}

/**
 * Initialize event handlers for the Vector Search page.
 *
 * @pseudocode
 * 1. Begin preloading the feature extractor.
 * 2. Cache the spinner element and hide it if present.
 * 3. Locate the search form element.
 * 4. Load embeddings and populate the tag filter dropdown with unique tags.
 * 5. Fetch meta stats and display the embedding count in the header.
 * 6. Attach `handleSearch` to the form and intercept Enter key submissions.
 */
export async function init() {
  preloadExtractor();
  spinner = document.getElementById("search-spinner");
  if (spinner) spinner.style.display = "none";
  const form = document.getElementById("vector-search-form");
  const messageEl = document.getElementById("search-results-message");

  const [embeddings, meta] = await Promise.all([
    vectorSearch.loadEmbeddings(),
    fetchJson(`${DATA_DIR}client_embeddings.meta.json`).catch(() => null)
  ]);

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
