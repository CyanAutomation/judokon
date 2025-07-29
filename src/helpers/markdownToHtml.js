import { marked } from "../vendor/marked.esm.js";

/**
 * Convert Markdown text to HTML using the marked parser.
 *
 * @pseudocode
 * 1. Normalize the input text:
 *    - Use an empty string when `text` is null or undefined.
 * 2. Parse the Markdown using `marked.parse`.
 * 3. Return the generated HTML string.
 *
 * @param {string} [text] - Markdown content to convert.
 * @returns {string} HTML string produced by `marked`.
 */
export function markdownToHtml(text) {
  return marked.parse(text || "");
}
