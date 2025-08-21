/**
 * Format a file path string for display in the Source column.
 * Each path segment appears on a new line.
 *
 * @pseudocode
 * 1. Create an empty `DocumentFragment`.
 * 2. Split `source` by `/`.
 * 3. For each segment:
 *    a. Append a `<span>` with the segment text.
 *    b. Append a `<br>` if it is not the last segment.
 * 4. Return the fragment.
 *
 * @param {string} source - File path like "design/foo/bar.md".
 * @returns {DocumentFragment} Fragment with line breaks between segments.
 */
export function formatSourcePath(source) {
  const fragment = document.createDocumentFragment();
  source.split("/").forEach((part, idx, arr) => {
    const span = document.createElement("span");
    span.textContent = part;
    fragment.appendChild(span);
    if (idx < arr.length - 1) {
      fragment.appendChild(document.createElement("br"));
    }
  });
  return fragment;
}

/**
 * Format tag arrays for display.
 *
 * @pseudocode
 * 1. If `tags` is an array, join with `", "`.
 * 2. Otherwise, return an empty string.
 *
 * @param {string[]} tags - Tag names.
 * @returns {string} Comma separated tag string.
 */
export function formatTags(tags) {
  return Array.isArray(tags) ? tags.join(", ") : "";
}
