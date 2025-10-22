/**
 * Normalize text for case-insensitive comparisons.
 *
 * @param {string} text - Source string.
 * @returns {string} Normalized value.
 */
function normalize(text) {
  if (!text) return "";
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Extract searchable tokens from a settings item.
 *
 * @param {HTMLElement} item - Settings item wrapper.
 * @returns {string[]} Collection of searchable strings.
 */
function getSearchableTokens(item) {
  const label = item.querySelector("label span");
  const description = item.querySelector("p");
  const input = item.querySelector("input[data-flag]");
  return [label?.textContent ?? "", description?.textContent ?? "", input?.dataset.flag ?? ""].map(
    normalize
  );
}

/**
 * Update the search results status text.
 *
 * @param {HTMLElement | null} statusNode - Live region node.
 * @param {number} matchCount - Number of matched feature flags.
 * @param {number} totalCount - Total number of feature flags.
 * @param {boolean} hasQuery - Whether the user entered a search term.
 * @returns {void}
 */
function announceSearchStatus(statusNode, matchCount, totalCount, hasQuery) {
  if (!statusNode) return;
  const allMessage = `Showing all ${totalCount} feature flags`;
  const filteredMessage = `Showing ${matchCount} of ${totalCount} feature flags`;
  statusNode.textContent = hasQuery ? filteredMessage : allMessage;
}

/**
 * Apply the current search filter to the feature flags container.
 *
 * @param {HTMLInputElement} input - Search input element.
 * @param {HTMLElement} container - Feature flags container.
 * @param {HTMLElement | null} emptyStateNode - Node shown when no matches remain.
 * @param {HTMLElement | null} statusNode - Live region node for announcing results.
 * @returns {void}
 */
function filterFeatureFlags(input, container, emptyStateNode, statusNode) {
  const term = normalize(input.value);
  const items = Array.from(container.querySelectorAll(":scope > .settings-item"));
  const hasQuery = term.length > 0;
  let matchCount = 0;

  items.forEach((item) => {
    const tokens = getSearchableTokens(item);
    const matches = !hasQuery || tokens.some((token) => token.includes(term));
    item.style.display = matches ? "" : "none";
    if (matches) {
      matchCount += 1;
    }
  });

  if (emptyStateNode) {
    emptyStateNode.hidden = matchCount !== 0;
  }
  announceSearchStatus(statusNode, matchCount, items.length, hasQuery);
}

let latestFilter = null;

/**
 * Wire up the advanced settings search input.
 *
 * @pseudocode
 * 1. Validate the provided DOM nodes; exit early if missing.
 * 2. Define `applyFilter` that normalizes the query and toggles each feature flag row.
 * 3. Attach `input` and `keydown` listeners to update results and clear on Escape.
 * 4. Store the latest filter callback so subsequent renders can reapply it.
 * 5. Run the filter once to sync the UI with any pre-filled query.
 *
 * @param {{
 *   input: HTMLInputElement | null,
 *   container: HTMLElement | null,
 *   emptyStateNode?: HTMLElement | null,
 *   statusNode?: HTMLElement | null
 * }} options - Search dependencies.
 * @returns {{ applyFilter: () => void } | undefined} Filter helpers when setup succeeds.
 */
export function setupAdvancedSettingsSearch({ input, container, emptyStateNode, statusNode }) {
  if (!input || !container) {
    return undefined;
  }

  const applyFilter = () =>
    filterFeatureFlags(input, container, emptyStateNode ?? null, statusNode ?? null);

  const handleEscape = (event) => {
    if (event.key !== "Escape") {
      return;
    }
    if (!input.value) {
      return;
    }
    event.preventDefault();
    input.value = "";
    applyFilter();
  };

  input.addEventListener("input", applyFilter);
  input.addEventListener("keydown", handleEscape);

  latestFilter = applyFilter;
  applyFilter();

  return { applyFilter };
}

/**
 * Reapply the most recent advanced settings filter after rerendering flags.
 *
 * @pseudocode
 * 1. Guard when no filter has been registered.
 * 2. Invoke the stored filter callback.
 *
 * @returns {void}
 */
export function reapplyAdvancedSettingsFilter() {
  if (typeof latestFilter === "function") {
    latestFilter();
  }
}
