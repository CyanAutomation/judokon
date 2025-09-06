/**
 * Map of result states to their UI handlers.
 *
 * @summary Declarative mapping for search result UI states.
 * @pseudocode
 * 1. Define messages, CSS classes, and spinner actions for each state.
 * 2. Provide a helper to apply a state's configuration.
 */
export const RESULTS_STATE = {
  loading: { text: "Searching...", className: null, spinner: "show" },
  results: { text: "", className: null, spinner: "hide" },
  empty: {
    text: "No close matches found — refine your query.",
    className: "search-result-empty",
    spinner: "hide"
  },
  error: {
    text: "An error occurred while searching.",
    className: "search-result-empty",
    spinner: "hide"
  }
};

/**
 * Apply a results state to the UI.
 *
 * @summary Update spinner and message element based on search state.
 * @pseudocode
 * 1. Look up the configuration for the given state.
 * 2. Toggle spinner visibility using the mapped action.
 * 3. Update message text and toggle the `search-result-empty` class.
 * 4. Allow optional `overrideText` to customize the message.
 *
 * @param {{show:Function, hide:Function}} spinner - Spinner controller.
 * @param {HTMLElement} messageEl - Message display element.
 * @param {keyof typeof RESULTS_STATE} state - Desired results state.
 * @param {string} [overrideText] - Optional replacement message.
 * @returns {void}
 */
export function applyResultsState(spinner, messageEl, state, overrideText) {
  const cfg = RESULTS_STATE[state];
  if (!cfg) return;
  spinner?.[cfg.spinner]?.();
  if (messageEl) {
    messageEl.textContent = overrideText ?? cfg.text;
    messageEl.classList.toggle("search-result-empty", cfg.className === "search-result-empty");
  }
}

export default applyResultsState;
