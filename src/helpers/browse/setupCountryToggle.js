import { createCountrySlider } from "../countrySlider.js";
import { toggleCountryPanel } from "../countryPanel.js";

/**
 * Build a DOM adapter that exposes the imperative interactions required by the
 * country toggle controller.
 *
 * @pseudocode
 * 1. Derive helper functions for reading the native `open` state and loading flag buttons.
 * 2. Mirror the disclosure state via the shared `toggleCountryPanel` helper so focus and aria are synchronized.
 * 3. Return the adapter consumed by {@link createCountryToggleController}.
 *
 * @param {HTMLElement} toggleButton - Summary element that toggles the panel.
 * @param {HTMLDetailsElement} panel - Panel element that holds the country list.
 * @param {Element} listContainer - Container that receives the lazily-created flag buttons.
 * @param {object} [dependencies]
 * @param {typeof toggleCountryPanel} [dependencies.toggleCountryPanelImpl]
 * @param {typeof createCountrySlider} [dependencies.createCountrySliderImpl]
 * @returns {CountryToggleAdapter}
 */
export function createCountryToggleAdapter(
  toggleButton,
  panel,
  listContainer,
  {
    toggleCountryPanelImpl = toggleCountryPanel,
    createCountrySliderImpl = createCountrySlider
  } = {}
) {
  return {
    isPanelOpen: () => panel?.open ?? false,
    reflectPanelState: () => toggleCountryPanelImpl(toggleButton, panel, panel?.open ?? false),
    closePanel: () => toggleCountryPanelImpl(toggleButton, panel, false),
    async loadFlags() {
      if (!listContainer || listContainer.children.length > 0) {
        return;
      }
      await createCountrySliderImpl(listContainer);
    },
    hasFlags: () => !!listContainer && listContainer.children.length > 0
  };
}

/**
 * @typedef {object} CountryToggleAdapter
 * @property {() => boolean} isPanelOpen - Returns whether the panel is currently open.
 * @property {() => void} reflectPanelState - Synchronize focus/aria with the panel's `open` property.
 * @property {() => void} closePanel - Close the disclosure and restore focus to the summary toggle.
 * @property {() => Promise<void>} loadFlags - Lazily create the country slider contents.
 * @property {() => boolean} [hasFlags] - Optional hook that reports whether the slider already contains flag buttons.
 */

/**
 * Create a controller that tracks the pure state for the country toggle.
 *
 * @pseudocode
 * 1. Capture the initial "flags loaded" state using the adapter hook if available.
 * 2. When the native `toggle` event fires:
 *    a. Reflect the `open` attribute back to focus/aria via the adapter.
 *    b. Lazily load flags the first time the disclosure opens.
 * 3. When keydown events arrive, close the panel on Escape by clearing the `open` state.
 * 4. Expose a getter that lets callers inspect whether flags were loaded.
 *
 * @param {CountryToggleAdapter} adapter - Adapter providing imperative DOM hooks.
 * @returns {{ handleToggle: () => Promise<void>, handleKeydown: (event: KeyboardEvent) => void, countriesLoaded: () => boolean }}
 */
export function createCountryToggleController(adapter) {
  let flagsLoaded = adapter.hasFlags ? adapter.hasFlags() : false;

  return {
    async handleToggle() {
      const isOpen = adapter.isPanelOpen?.() ?? false;
      adapter.reflectPanelState?.();
      if (isOpen && !flagsLoaded) {
        await adapter.loadFlags?.();
        flagsLoaded = adapter.hasFlags ? adapter.hasFlags() : true;
        if (flagsLoaded) {
          adapter.reflectPanelState?.();
        }
      }
    },
    handleKeydown(event) {
      if (event.key !== "Escape") {
        return;
      }
      if (adapter.isPanelOpen?.()) {
        adapter.closePanel?.();
      }
    },
    countriesLoaded: () => flagsLoaded
  };
}

/**
 * Set up the country selection panel toggle behavior.
 *
 * @pseudocode
 * 1. Build or accept an adapter that knows how to mutate the DOM.
 * 2. Instantiate the toggle controller to track lazy-loading state and event handlers.
 * 3. Wire the controller handlers to the provided DOM nodes.
 * 4. Expose a predicate so callers can check whether the slider was populated.
 *
 * @param {HTMLElement} toggleButton - Summary element controlling the panel.
 * @param {HTMLDetailsElement} panel - Country panel element.
 * @param {Element} listContainer - Container for flag buttons.
 * @param {{ adapter?: CountryToggleAdapter }} [options] - Optional override adapter used primarily for tests.
 * @returns {() => boolean} Function that reports whether the flag slider has been loaded.
 */
export function setupCountryToggle(toggleButton, panel, listContainer, { adapter } = {}) {
  const resolvedAdapter = adapter ?? createCountryToggleAdapter(toggleButton, panel, listContainer);
  const controller = createCountryToggleController(resolvedAdapter);

  panel?.addEventListener?.("toggle", controller.handleToggle);
  panel?.addEventListener?.("keydown", controller.handleKeydown);

  return controller.countriesLoaded;
}

export default setupCountryToggle;
