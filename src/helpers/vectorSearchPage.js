import { onDomReady } from "./domReady.js";
import vectorSearch from "./vectorSearch/index.js";
import { markdownToHtml } from "./markdownToHtml.js";
import { fetchJson } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";
import { createSnippetElement } from "./snippetFormatter.js";
import {
  selectMatches,
  formatSourcePath,
  formatTags,
  getExtractor,
  SIMILARITY_THRESHOLD
} from "./api/vectorSearchPage.js";

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
  const input = document.getElementById("vector-search-input");
  const table = document.getElementById("vector-results-table");
  const tbody = table?.querySelector("tbody");
  const query = input.value.trim();
  if (tbody) tbody.textContent = "";
  if (!query) return;
  const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const expandedQuery = await vectorSearch.expandQueryWithSynonyms(query);
  const messageEl = document.getElementById("search-results-message");
  const tagSelect = document.getElementById("tag-filter");
  const selected =
    tagSelect && tagSelect.value && tagSelect.value !== "all" ? [tagSelect.value] : [];
  spinner.style.display = "block";
  if (messageEl) {
    messageEl.textContent = "Searching...";
    messageEl.classList.remove("search-result-empty");
  }
  try {
    const model = await getExtractor();
    const result = await model(expandedQuery, { pooling: "mean" });
    const vector = Array.from(result.data ?? result);
    const matches = await vectorSearch.findMatches(vector, 5, selected, expandedQuery);
    if (messageEl) {
      messageEl.textContent = "";
      messageEl.classList.remove("search-result-empty");
    }
    spinner.style.display = "none";
    if (matches === null) {
      if (messageEl)
        messageEl.textContent = "Embeddings could not be loaded – please check console.";
      return;
    }
    if (matches.length === 0) {
      if (messageEl) {
        messageEl.textContent = "No close matches found — refine your query.";
        messageEl.classList.add("search-result-empty");
      }
      return;
    }

    const strongMatches = matches.filter((m) => m.score >= SIMILARITY_THRESHOLD);
    const weakMatches = matches.filter((m) => m.score < SIMILARITY_THRESHOLD);

    const toRender = selectMatches(strongMatches, weakMatches);

    if (strongMatches.length === 0 && messageEl) {
      messageEl.textContent =
        "\u26A0\uFE0F No strong matches found, but here are the closest matches based on similarity.";
      messageEl.classList.add("search-result-empty");
    }

    for (const [idx, match] of toRender.entries()) {
      const row = document.createElement("tr");
      row.classList.add("search-result-item");
      if (idx === 0) row.classList.add("top-match");
      row.dataset.id = match.id;
      row.setAttribute("role", "button");
      row.tabIndex = 0;
      row.setAttribute("aria-expanded", "false");

      const textCell = document.createElement("td");
      textCell.classList.add("match-text");
      const snippet = createSnippetElement(match.text, queryTerms);
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
      if (match.score >= 0.8) scoreCell.classList.add("score-high");
      else if (match.score >= 0.6) scoreCell.classList.add("score-mid");
      else scoreCell.classList.add("score-low");

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
 * 3. Load embeddings and populate the tag filter dropdown with unique tags.
 * 4. Fetch meta stats and display the embedding count in the header.
 * 5. Attach `handleSearch` to the form and intercept Enter key submissions.
 */
export async function init() {
  spinner = document.getElementById("search-spinner");
  if (spinner) spinner.style.display = "none";
  const form = document.getElementById("vector-search-form");
  const messageEl = document.getElementById("search-results-message");

  const [embeddings, meta] = await Promise.all([
    vectorSearch.loadEmbeddings(),
    fetchJson(`${DATA_DIR}client_embeddings.meta.json`).catch(() => null)
  ]);

  let versionMismatch = false;
  if (Array.isArray(embeddings)) {
    for (const entry of embeddings) {
      if (entry.version !== vectorSearch.CURRENT_EMBEDDING_VERSION) {
        versionMismatch = true;
        console.warn(
          `Embedding ${entry.id ?? "(unknown id)"} has version ${entry.version}; expected ${vectorSearch.CURRENT_EMBEDDING_VERSION}`
        );
      }
    }
  }
  if (meta && meta.version !== vectorSearch.CURRENT_EMBEDDING_VERSION) {
    versionMismatch = true;
    console.warn(
      `Embedding metadata version ${meta.version} does not match ${vectorSearch.CURRENT_EMBEDDING_VERSION}`
    );
  }
  if (versionMismatch && messageEl) {
    // Use a dedicated warning element to avoid overwriting other messages
    let warningEl = messageEl.querySelector(".embedding-warning");
    if (!warningEl) {
      warningEl = document.createElement("div");
      warningEl.className = "embedding-warning";
      messageEl.appendChild(warningEl);
    }
    warningEl.textContent = "⚠️ Embedding data is out of date. Run npm run generate:embeddings.";
  }

  const tagSelect = document.getElementById("tag-filter");
  if (tagSelect && Array.isArray(embeddings)) {
    const tags = new Set();
    embeddings.forEach((e) => {
      if (Array.isArray(e.tags)) {
        e.tags.forEach((t) => tags.add(t));
      }
    });
    tagSelect.innerHTML =
      '<option value="all">All</option>' +
      [...tags]
        .sort()
        .map((t) => `<option value="${t}">${t}</option>`)
        .join("");
  }

  const statsEl = document.getElementById("embedding-stats");
  if (statsEl && meta && typeof meta.count === "number") {
    statsEl.textContent = `${meta.count} embeddings loaded`;
  }

  form?.addEventListener("submit", handleSearch);
  form?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      form.requestSubmit();
    }
  });
}

onDomReady(init);
