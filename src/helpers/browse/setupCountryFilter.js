import { toggleCountryPanel } from "../countryPanel.js";

/**
 * @typedef {object} CountryFilterAdapter
 * @property {() => void} resetToAll - Ensure the "All" option remains checked when clearing the filter.
 * @property {(count: number, label: string) => void} updateLiveRegion - Announce the visible judoka count.
 * @property {() => void} closePanel - Close the country panel via the toggle helper.
 * @property {() => void} removeNoResultsMessage - Remove any existing "no results" message from the carousel.
 * @property {() => void} showNoResultsMessage - Append the "no results" message to the carousel.
 * @property {(target: EventTarget | null) => HTMLInputElement | null} findInputFromEvent - Extract a flag radio from an event target.
 * @property {(input: HTMLInputElement | null) => string} getInputValue - Read the country value associated with a radio input.
 */

/**
 * Build the DOM adapter for the country filter interactions.
 *
 * @pseudocode
 * 1. Provide helpers for resetting and reading the checked country radio inputs.
 * 2. Manage the aria-live region by re-querying from the carousel container when necessary.
 * 3. Manage creation and removal of the "no results" message.
 * 4. Use the shared `toggleCountryPanel` helper to close the panel.
 *
 * @param {Element} listContainer - Container holding country flag buttons.
 * @param {HTMLButtonElement} toggleButton - Panel toggle button.
 * @param {Element} panel - Country panel element.
 * @param {Element} carouselEl - Carousel container for feedback messages.
 * @param {Element} ariaLiveEl - Initial aria-live region reference.
 * @param {{ toggleCountryPanelImpl?: typeof toggleCountryPanel }} [dependencies]
 * @returns {CountryFilterAdapter}
 */
export function createCountryFilterAdapter(
  listContainer,
  toggleButton,
  panel,
  carouselEl,
  ariaLiveEl,
  { toggleCountryPanelImpl = toggleCountryPanel } = {}
) {
  let liveRegion = ariaLiveEl ?? null;

  return {
    resetToAll() {
      if (!listContainer) {
        console.warn("Country filter: listContainer is null, cannot reset selection");
        return;
      }
      const allInput = listContainer.querySelector('input.flag-radio[value="all"]');
      if (allInput instanceof HTMLInputElement) {
        allInput.checked = true;
      }
    },
    updateLiveRegion(count, label) {
      liveRegion = carouselEl?.querySelector?.(".carousel-aria-live") ?? liveRegion;
      if (liveRegion) {
        liveRegion.textContent = `Showing ${count} judoka for ${label}`;
      }
    },
    closePanel() {
      toggleCountryPanelImpl(toggleButton, panel, false);
    },
    removeNoResultsMessage() {
      const existing = carouselEl?.querySelector?.(".no-results-message");
      existing?.remove?.();
    },
    showNoResultsMessage() {
      if (!carouselEl) return;
      const doc = carouselEl.ownerDocument ?? document;
      const message = doc.createElement("div");
      message.className = "no-results-message";
      message.setAttribute("role", "status");
      message.setAttribute("aria-live", "polite");
      message.textContent = "No judoka available for this country";
      carouselEl.appendChild(message);
    },
    findInputFromEvent(target) {
      if (!listContainer) {
        return null;
      }
      if (target instanceof HTMLInputElement && target.classList.contains("flag-radio")) {
        return target;
      }
      const label = target instanceof Element ? target.closest("label.flag-button") : null;
      if (!label) {
        return null;
      }
      const forId = label.getAttribute("for");
      if (!forId) {
        return null;
      }
      const doc = listContainer.ownerDocument ?? document;
      const input = doc.getElementById(forId);
      if (!(input instanceof HTMLInputElement)) {
        return null;
      }
      return listContainer.contains(input) ? input : null;
    },
    getInputValue(input) {
      return input?.value ?? "all";
    }
  };
}

/**
 * Create the pure controller responsible for filtering judoka by country.
 *
 * @pseudocode
 * 1. When clearing:
 *    a. Reset the selected radio input to "All".
 *    b. Render the full judoka list.
 *    c. Update the aria-live region for "all countries".
 *    d. Remove any stale "no results" message and close the panel.
 * 2. When applying a country filter:
 *    a. Read the selected value from the radio input.
 *    b. Filter the judoka list by the selected value.
 *    c. Render the filtered list and update the aria-live message.
 *    d. Replace the "no results" message when the filter produces zero entries.
 *    e. Close the panel after applying the filter.
 * 3. Return the filtered list so callers (including tests) can inspect the result.
 *
 * @param {Array<Judoka>} judokaList - Complete list of judoka.
 * @param {(list: Array<Judoka>) => Promise<void> | void} render - Rendering callback supplied by the carousel runtime.
 * @param {CountryFilterAdapter} adapter - Adapter providing DOM side effects.
 * @returns {{ clear: () => Promise<Array<Judoka>>, select: (input: HTMLInputElement) => Promise<Array<Judoka>> }}
 */
export function createCountryFilterController(judokaList, render, adapter) {
  const toLabel = (value) => (value === "all" ? "all countries" : value);

  return {
    async clear() {
      adapter.resetToAll?.();
      await render(judokaList);
      adapter.updateLiveRegion?.(judokaList.length, toLabel("all"));
      adapter.removeNoResultsMessage?.();
      adapter.closePanel?.();
      return judokaList;
    },
    async select(input) {
      const value = adapter.getInputValue?.(input) ?? "all";
      const filtered =
        value === "all" ? judokaList : judokaList.filter((judoka) => judoka.country === value);
      await render(filtered);
      adapter.updateLiveRegion?.(filtered.length, toLabel(value));
      adapter.removeNoResultsMessage?.();
      if (filtered.length === 0) {
        adapter.showNoResultsMessage?.();
      }
      adapter.closePanel?.();
      return filtered;
    }
  };
}

/**
 * Wire up the country filter UI using the supplied adapter/controller pair.
 *
 * @pseudocode
 * 1. Resolve the DOM adapter (either provided or built from the DOM nodes).
 * 2. Instantiate the controller with the judoka list and render callback.
 * 3. Attach event listeners (click/change) that delegate to the controller methods.
 * 4. Return the controller for callers that need to observe state.
 *
 * @param {Element} listContainer - Container for flag buttons.
 * @param {HTMLButtonElement} clearButton - Button that clears the current filter.
 * @param {Array<Judoka>} judokaList - Complete judoka dataset.
 * @param {(list: Array<Judoka>) => Promise<void> | void} render - Rendering callback.
 * @param {HTMLButtonElement} toggleButton - Toggle control for the country panel.
 * @param {Element} panel - Country panel element.
 * @param {Element} carouselEl - Carousel container for feedback messages.
 * @param {Element} ariaLiveEl - Initial aria-live region element.
 * @param {{ adapter?: CountryFilterAdapter }} [options] - Optional adapter override for tests.
 * @returns {{ clear: () => Promise<Array<Judoka>>, select: (input: HTMLInputElement) => Promise<Array<Judoka>> }}
 */
export function setupCountryFilter(
  listContainer,
  clearButton,
  judokaList,
  render,
  toggleButton,
  panel,
  carouselEl,
  ariaLiveEl,
  { adapter } = {}
) {
  const resolvedAdapter =
    adapter ??
    createCountryFilterAdapter(listContainer, toggleButton, panel, carouselEl, ariaLiveEl);
  const controller = createCountryFilterController(judokaList, render, resolvedAdapter);

  clearButton?.addEventListener?.("click", () => {
    void controller.clear();
  });

  listContainer?.addEventListener?.("change", (event) => {
    const input = resolvedAdapter.findInputFromEvent?.(event.target) ?? null;
    if (!input) {
      return;
    }
    void controller.select(input);
  });

  return controller;
}

export default setupCountryFilter;
