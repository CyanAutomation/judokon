import { marked } from "../vendor/marked.esm.js";

/**
 * Convert Markdown text to HTML using the marked parser.
 *
 * @pseudocode
 * 1. If `text` is empty, null or undefined:
 *    - Return an empty string.
 * 2. Otherwise, parse the Markdown using `marked.parse`.
 * 3. Return the generated HTML string.
 *
 * @param {string} [text] - Markdown content to convert.
 * @returns {string} HTML string produced by `marked`.
 */
export function markdownToHtml(text) {
  if (!text) return "";
  return marked.parse(text);
}
