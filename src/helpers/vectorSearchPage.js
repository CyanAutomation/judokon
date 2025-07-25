import { onDomReady } from "./domReady.js";
import { findMatches } from "./vectorSearch.js";
import { pipeline } from "@xenova/transformers";

let extractor;

async function getExtractor() {
  if (!extractor) {
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
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
  resultsEl.textContent = "Searching...";
  try {
    const model = await getExtractor();
    const vector = (await model(query))[0];
    const matches = await findMatches(Array.from(vector), 3);
    resultsEl.textContent = "";
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
    resultsEl.textContent = "An error occurred while searching.";
  }
}

function init() {
  const form = document.getElementById("vector-search-form");
  form?.addEventListener("submit", handleSearch);
}

onDomReady(init);
