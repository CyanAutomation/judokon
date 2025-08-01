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
 * 1. Create a container and span for the snippet text, highlighting `terms` when provided.
 * 2. When `text` exceeds `SNIPPET_LIMIT`, append an ellipsis and a
 *    "Show more" button that toggles the full content.
 *    - Update the button label to "Show less" when expanded.
 *    - Prevent the toggle from triggering row click events.
 * 3. Return the container element.
 *
 * @param {string} text - The full match text.
 * @param {string[]} [terms=[]] - Search terms for highlighting.
 * @returns {HTMLElement} Snippet DOM element.
 */
export function createSnippetElement(text, terms = []) {
  const container = document.createElement("div");
  const span = document.createElement("span");
  const needsTruncate = text.length > SNIPPET_LIMIT;
  const shortText = needsTruncate ? text.slice(0, SNIPPET_LIMIT).trimEnd() + "\u2026" : text;
  const shortHtml = highlightTerms(shortText, terms);
  const fullHtml = highlightTerms(text, terms);
  span.innerHTML = shortHtml;
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
      span.innerHTML = expanded ? shortHtml : fullHtml;
      btn.textContent = expanded ? "Show more" : "Show less";
    });
    container.appendChild(document.createTextNode(" "));
    container.appendChild(btn);
  }
  return container;
}
