import { toggleCountryPanel } from "../countryPanel.js";

/**
 * @typedef {object} CountryFilterAdapter
 * @property {(count: number, label: string) => void} updateLiveRegion - Announce the visible judoka count.
 * @property {() => void} closePanel - Close the country panel via the toggle helper.
 * @property {() => void} removeNoResultsMessage - Remove any existing "no results" message from the carousel.
 * @property {() => void} showNoResultsMessage - Append the "no results" message to the carousel.
 * @property {(button: HTMLInputElement | null) => string} getButtonValue - Read the country value associated with a radio.
 * @property {() => HTMLInputElement[]} getRadios - List the available country filter radio inputs.
 * @property {() => HTMLInputElement | null} getDefaultRadio - Return the "all countries" radio input if present.
 */

/**
 * Build the DOM adapter for the country filter interactions.
 *
 * @pseudocode
 * 1. Provide helpers for reading/updating the radio inputs that drive the filter state.
 * 2. Manage the aria-live region by re-querying from the carousel container when necessary.
 * 3. Manage creation and removal of the "no results" message.
 * 4. Use the shared `toggleCountryPanel` helper to close the panel.
 *
 * @param {Element} listContainer - Container holding the country flag radio options.
 * @param {HTMLElement} toggleButton - Panel toggle button.
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
    getButtonValue(button) {
      return button?.value ?? "all";
    },
    getRadios() {
      if (!listContainer) return [];
      return Array.from(
        listContainer.querySelectorAll('input[type="radio"][name="country-filter"]')
      );
    },
    getDefaultRadio() {
      return (
        listContainer?.querySelector?.('input[type="radio"][name="country-filter"][value="all"]') ??
        null
      );
    }
  };
}

/**
 * Create the pure controller responsible for filtering judoka by country.
 *
 * @pseudocode
 * 1. When clearing:
 *    a. Ensure the "all" radio input is checked.
 *    b. Render the full judoka list.
 *    c. Update the aria-live region for "all countries".
 *    d. Remove any stale "no results" message and close the panel.
 * 2. When applying a country filter:
 *    a. Derive the currently checked radio value.
 *    b. Filter the judoka list by the selected value.
 *    c. Render the filtered list and update the aria-live message.
 *    d. Replace the "no results" message when the filter produces zero entries.
 *    e. Close the panel after applying the filter.
 * 3. Return the filtered list so callers (including tests) can inspect the result.
 *
 * @param {Array<Judoka>} judokaList - Complete list of judoka.
 * @param {(list: Array<Judoka>) => Promise<void> | void} render - Rendering callback supplied by the carousel runtime.
 * @param {CountryFilterAdapter} adapter - Adapter providing DOM side effects.
 * @returns {{ clear: () => Promise<Array<Judoka>>, select: (button: HTMLInputElement | null) => Promise<Array<Judoka>> }}
 */
export function createCountryFilterController(judokaList, render, adapter) {
  const toLabel = (value) => (value === "all" ? "all countries" : value);
  const getRadios = () => adapter.getRadios?.() ?? [];
  const getDefaultRadio = () =>
    adapter.getDefaultRadio?.() ?? getRadios().find((r) => r.value === "all") ?? null;
  const getCheckedRadio = () => getRadios().find((radio) => radio.checked) ?? null;

  return {
    async clear() {
      const defaultRadio = getDefaultRadio();
      if (defaultRadio) {
        defaultRadio.checked = true;
      }
      await render(judokaList);
      adapter.updateLiveRegion?.(judokaList.length, toLabel("all"));
      adapter.removeNoResultsMessage?.();
      adapter.closePanel?.();
      return judokaList;
    },
    async select(button) {
      let radio = null;
      if (button instanceof HTMLInputElement && button.type === "radio") {
        radio = button;
      }
      radio ??= getCheckedRadio();
      if (radio) {
        radio.checked = true;
      }
      const value = adapter.getButtonValue?.(radio) ?? "all";
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
 * 3. Attach change listeners that delegate to the controller methods.
 * 4. Return the controller for callers that need to observe state.
 *
 * @param {Element} listContainer - Container for flag radio options.
 * @param {HTMLButtonElement} clearButton - Button that clears the current filter.
 * @param {Array<Judoka>} judokaList - Complete judoka dataset.
 * @param {(list: Array<Judoka>) => Promise<void> | void} render - Rendering callback.
 * @param {HTMLElement} toggleButton - Toggle control for the country panel.
 * @param {Element} panel - Country panel element.
 * @param {Element} carouselEl - Carousel container for feedback messages.
 * @param {Element} ariaLiveEl - Initial aria-live region element.
 * @param {{ adapter?: CountryFilterAdapter }} [options] - Optional adapter override for tests.
 * @returns {{ clear: () => Promise<Array<Judoka>>, select: (button: HTMLInputElement | null) => Promise<Array<Judoka>> }}
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
  let skipNextChange = false;
  const resolveRadioFromTarget = (target) => {
    if (!listContainer || !(target instanceof Element)) {
      return null;
    }
    if (target instanceof HTMLInputElement && target.type === "radio" && target.name === "country-filter") {
      return target;
    }
    const label = target.closest?.("label.flag-button");
    if (!label) {
      return null;
    }
    const forId = label.getAttribute("for");
    if (forId) {
      const radio = listContainer.querySelector?.(`#${forId}`);
      return radio instanceof HTMLInputElement ? radio : null;
    }
    const nestedRadio = label.querySelector?.('input[type="radio"][name="country-filter"]');
    return nestedRadio instanceof HTMLInputElement ? nestedRadio : null;
  };

  clearButton?.addEventListener?.("click", () => {
    void controller.clear();
  });

  listContainer?.addEventListener?.("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== "radio") {
      return;
    }
    if (skipNextChange) {
      skipNextChange = false;
      return;
    }
    void controller.select(target);
  });

  listContainer?.addEventListener?.("click", (event) => {
    const radio = resolveRadioFromTarget(event.target);
    if (!radio) {
      return;
    }
    skipNextChange = true;
    const radios = resolvedAdapter.getRadios?.() ?? [];
    for (const input of radios) {
      input.checked = input === radio;
    }
    void controller.select(radio).finally(() => {
      if (typeof setTimeout === "function") {
        setTimeout(() => {
          skipNextChange = false;
        }, 0);
      } else {
        skipNextChange = false;
      }
    });
  });

  return controller;
}

export default setupCountryFilter;
