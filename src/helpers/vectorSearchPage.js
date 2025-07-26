import { onDomReady } from "./domReady.js";
import { findMatches } from "./vectorSearch.js";
// Load Transformers.js dynamically from jsDelivr when first used
// This avoids bundling the large library with the rest of the code.

let extractor;
let spinner;

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
    const vector = (await model(query))[0];
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
    const list = document.createElement("ol");
    for (const match of matches) {
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
