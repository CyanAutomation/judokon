/**
 * Prepare DOM elements and query for a new search.
 *
 * @pseudocode
 * 1. Locate the search input, results table body, and message element.
 * 2. When the input is missing, return early with an empty query.
 * 3. Trim the query value and clear any previous results.
 * 4. Return the query, tbody reference, and message element.
 *
 * @returns {{query: string, tbody: HTMLTableSectionElement|null, messageEl: HTMLElement|null}}
 */
export function prepareSearchUi() {
  const input = document.getElementById("vector-search-input");
  const table = document.getElementById("vector-results-table");
  const tbody = table?.querySelector("tbody");
  const messageEl = document.getElementById("search-results-message");
  if (!input) return { query: "", tbody, messageEl };
  const query = input.value.trim();
  if (tbody) tbody.textContent = "";
  return { query, tbody, messageEl };
}

/**
 * Return an array containing the selected tag, if any.
 *
 * @pseudocode
 * 1. Read the value from the tag filter dropdown.
 * 2. When the value is not "all", return it in an array.
 * 3. Otherwise, return an empty array.
 *
 * @returns {string[]}
 */
export function getSelectedTags() {
  const tagSelect = document.getElementById("tag-filter");
  return tagSelect && tagSelect.value && tagSelect.value !== "all" ? [tagSelect.value] : [];
}
