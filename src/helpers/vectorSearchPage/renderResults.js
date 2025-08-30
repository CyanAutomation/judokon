import { createSnippetElement } from "../snippetFormatter.js";
import { formatSourcePath, formatTags } from "./renderUtils.js";

export const RESULT_TABLE_CONFIG = {
  scoreClasses: [
    { min: 0.8, className: "score-high" },
    { min: 0.6, className: "score-mid" },
    { min: 0, className: "score-low" }
  ]
};

function buildResultRow(match, queryTerms, isTop) {
  const row = document.createElement("tr");
  row.classList.add("search-result-item");
  if (isTop) row.classList.add("top-match");
  row.dataset.id = match.id;
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
  const scoreClass = RESULT_TABLE_CONFIG.scoreClasses.find((c) => match.score >= c.min)?.className;
  if (scoreClass) scoreCell.classList.add(scoreClass);

  row.append(textCell, sourceCell, tagsCell, scoreCell);
  return row;
}

/**
 * Render search results into the table body.
 *
 * @pseudocode
 * 1. Iterate over matches to display.
 * 2. Build a row for each match, marking the first as top match.
 * 3. Attach click and keyboard handlers to load surrounding context.
 * 4. Append each row to the results table body.
 *
 * @param {HTMLElement} tbody
 * @param {Array} toRender
 * @param {string[]} queryTerms
 * @param {(el: HTMLElement) => void} loadResultContext
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export function renderResults(tbody, toRender, queryTerms, loadResultContext) {
  for (const [idx, match] of toRender.entries()) {
    const row = buildResultRow(match, queryTerms, idx === 0);
    row.addEventListener("click", () => loadResultContext(row));
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        loadResultContext(row);
      }
    });
    tbody?.appendChild(row);
  }
}
