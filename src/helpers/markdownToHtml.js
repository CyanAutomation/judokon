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

/**
 * Convert Markdown to inline HTML without wrapping paragraphs.
 *
 * @pseudocode
 * 1. If `text` is empty, return an empty string.
 * 2. Split `text` on newline characters.
 * 3. For each line:
 *    - Parse with `marked.parse`.
 *    - Remove surrounding `<p>` tags.
 * 4. Join the lines with `<br>` and return the result.
 *
 * @param {string} [text] - Markdown content to convert.
 * @returns {string} Inline HTML string.
 */
export function markdownToInlineHtml(text) {
  if (!text) return "";
  return text
    .split("\n")
    .map((line) => marked.parse(line).replace(/^<p>|<\/p>$/g, ""))
    .join("<br>");
}
