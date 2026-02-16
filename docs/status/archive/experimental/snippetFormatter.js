/**
 * Archived experimental helper.
 *
 * This file is intentionally stored outside runtime paths and is not imported by the app.
 */

import { escapeHTML } from "./utils.js";

/**
 * Maximum number of characters to show before truncating match text.
 * @type {number}
 */
const SNIPPET_LIMIT = 200;

/**
 * Highlight occurrences of query terms in text.
 *
 * @pseudocode
 * 1. Return the original text when `terms` is empty.
 * 2. Escape HTML in `text` using `escapeHTML`.
 * 3. Build a case-insensitive regular expression from `terms`.
 * 4. Replace matches with `<mark>` wrapped text and return the result.
 *
 * @param {string} text - The text to search within.
 * @param {string[]} terms - Words to highlight.
 * @returns {string} HTML string with `<mark>` wrapped matches.
 */
export function highlightTerms(text, terms) {
  const safe = escapeHTML(text ?? "");
  if (!Array.isArray(terms) || terms.length === 0) return safe;
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (escaped.length === 0) return safe;
  const regex = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
  return safe.replace(regex, "<mark>$1</mark>");
}

/**
 * Build a snippet element with optional truncation.
 *
 * @pseudocode
 * 1. Create a `<details>` wrapper for the snippet content.
 * 2. Render the truncated snippet within a `<summary>` element, highlighting `terms` once.
 * 3. Render the full snippet inside a block container and highlight `terms` once.
 * 4. When the snippet does not require truncation, show the `<details>` in an open, static state.
 * 5. Return the `<details>` wrapper.
 *
 * @param {string} text - The full match text.
 * @param {string[]} [terms=[]] - Search terms for highlighting.
 * @returns {HTMLElement} Snippet DOM element.
 */
export function createSnippetElement(text, terms = []) {
  const details = document.createElement("details");
  details.classList.add("snippet-details");

  const needsTruncate = text.length > SNIPPET_LIMIT;
  const truncated = needsTruncate ? text.slice(0, SNIPPET_LIMIT).trimEnd() + "\u2026" : text;

  const summary = document.createElement("summary");
  summary.classList.add("snippet-summary");
  summary.innerHTML = highlightTerms(truncated, terms);
  details.appendChild(summary);

  const full = document.createElement("div");
  full.classList.add("snippet-full");
  full.innerHTML = highlightTerms(text, terms);
  details.appendChild(full);

  if (!needsTruncate) {
    details.setAttribute("open", "");
    details.classList.add("snippet-details-static");
    summary.hidden = true;
  }

  return details;
}
