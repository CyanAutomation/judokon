import { createCountrySlider } from "../countrySlider.js";
import { toggleCountryPanel } from "../countryPanel.js";
import { handleKeyboardNavigation } from "./handleKeyboardNavigation.js";

/**
 * Build a DOM adapter that exposes the imperative interactions required by the
 * country toggle controller.
 *
 * @pseudocode
 * 1. Derive helper functions for reading panel state and loading flag buttons.
 * 2. Delegate to the concrete helpers from the browse module tree.
 * 3. Return the adapter consumed by {@link createCountryToggleController}.
 *
 * @param {HTMLButtonElement} toggleButton - Toggle control for the panel.
 * @param {Element} panel - Panel element that holds the country list.
 * @param {Element} listContainer - Container that receives the lazily-created flag buttons.
 * @param {object} [dependencies]
 * @param {typeof toggleCountryPanel} [dependencies.toggleCountryPanelImpl]
 * @param {typeof createCountrySlider} [dependencies.createCountrySliderImpl]
 * @param {typeof handleKeyboardNavigation} [dependencies.handleKeyboardNavigationImpl]
 * @returns {CountryToggleAdapter}
 */
export function createCountryToggleAdapter(
  toggleButton,
  panel,
  listContainer,
  {
    toggleCountryPanelImpl = toggleCountryPanel,
    createCountrySliderImpl = createCountrySlider,
    handleKeyboardNavigationImpl = handleKeyboardNavigation
  } = {}
) {
  return {
    isPanelOpen: () => panel?.classList?.contains?.("open") ?? false,
    togglePanel: (force) => toggleCountryPanelImpl(toggleButton, panel, force),
    async loadFlags() {
      if (!listContainer || listContainer.children.length > 0) {
        return;
      }
      await createCountrySliderImpl(listContainer);
    },
    hasFlags: () => !!listContainer && listContainer.children.length > 0,
    handleArrowNavigation: (event) => {
      handleKeyboardNavigationImpl(event, listContainer, "input.flag-radio");
    }
  };
}

/**
 * @typedef {object} CountryToggleAdapter
 * @property {() => boolean} isPanelOpen - Returns whether the panel is currently marked as open.
 * @property {(force?: boolean) => void} togglePanel - Imperatively toggle the panel visibility.
 * @property {() => Promise<void>} loadFlags - Lazily create the country slider contents.
 * @property {() => boolean} [hasFlags] - Optional hook that reports whether the slider already contains flag buttons.
 * @property {(event: KeyboardEvent) => void} handleArrowNavigation - Delegate keyboard navigation for the flag buttons.
 */

/**
 * Create a controller that tracks the pure state for the country toggle.
 *
 * @pseudocode
 * 1. Capture the initial "flags loaded" state using the adapter hook if available.
 * 2. When the toggle handler runs:
 *    a. Read the open state before toggling.
 *    b. Toggle the panel through the adapter.
 *    c. If opening for the first time, invoke the lazy flag loader and update the cached state.
 * 3. When keydown events arrive:
 *    a. Close the panel on Escape via the adapter.
 *    b. Delegate Arrow navigation to the injected handler.
 * 4. Expose a getter that lets callers inspect whether flags were loaded.
 *
 * @param {CountryToggleAdapter} adapter - Adapter providing imperative DOM hooks.
 * @returns {{ handleToggle: () => Promise<void>, handleKeydown: (event: KeyboardEvent) => void, countriesLoaded: () => boolean }}
 */
export function createCountryToggleController(adapter) {
  let flagsLoaded = adapter.hasFlags ? adapter.hasFlags() : false;

  return {
    async handleToggle() {
      const wasOpen = adapter.isPanelOpen?.() ?? false;
      adapter.togglePanel?.();
      if (!wasOpen && !flagsLoaded) {
        await adapter.loadFlags?.();
        flagsLoaded = adapter.hasFlags ? adapter.hasFlags() : true;
      }
    },
    handleKeydown(event) {
      if (event.key === "Escape") {
        adapter.togglePanel?.(false);
        return;
      }

      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        adapter.handleArrowNavigation?.(event);
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
 * @param {HTMLButtonElement} toggleButton - Toggle control for the panel.
 * @param {Element} panel - Country panel element.
 * @param {Element} listContainer - Container for flag buttons.
 * @param {{ adapter?: CountryToggleAdapter }} [options] - Optional override adapter used primarily for tests.
 * @returns {() => boolean} Function that reports whether the flag slider has been loaded.
 */
export function setupCountryToggle(toggleButton, panel, listContainer, { adapter } = {}) {
  const resolvedAdapter = adapter ?? createCountryToggleAdapter(toggleButton, panel, listContainer);
  const controller = createCountryToggleController(resolvedAdapter);

  toggleButton?.addEventListener?.("click", controller.handleToggle);
  panel?.addEventListener?.("keydown", controller.handleKeydown);

  return controller.countriesLoaded;
}

export default setupCountryToggle;
