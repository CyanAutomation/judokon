/**
 * Creates a battle state indicator UI component that reflects the state of the battle engine's FSM.
 *
 * @pseudocode
 * 1. If the feature flag is disabled or DOM is unavailable, return a no-op API with isReady=false.
 * 2. Resolve `mount` and `announcer` to DOM elements; if missing return a no-op API.
 * 3. Create a root `<ul>` and an ARIA announcer `<p>`, append both to the provided mount points.
 * 4. Validate the catalog structure and fetch the state `catalog` via `getCatalog()`.
 * 5. Render the list of known states using a DocumentFragment to minimize reflows.
 * 6. Subscribe to `control.state.changed` events and on each change:
 *    - Refresh catalog with debounce when a new version is indicated.
 *    - Update `activeState` using efficient DOM queries.
 *    - Update the announcer text and manage an `unknown` flag when state is not in the catalog.
 * 7. Return an API with `cleanup()`, `isReady: true`, and `getActiveState()`.
 *
 * @param {object} config - The configuration object.
 * @param {boolean} [config.featureFlag=true] - A flag to enable or disable the component.
 * @param {HTMLElement|string} config.mount - The DOM element or selector string for the main component.
 * @param {HTMLElement|string} config.announcer - The DOM element or selector string for the ARIA live announcer.
 * @param {object} config.events - An event bus object with `on` and `off` methods.
 * @param {function} config.getCatalog - A function that returns a promise resolving to the state catalog.
 * @returns {Promise<{cleanup: function, isReady: boolean, getActiveState: function}>} - A promise that resolves to the component's public API.
 */
export async function createBattleStateIndicator({
  featureFlag = true,
  mount,
  announcer,
  events,
  getCatalog
}) {
  if (!featureFlag || typeof window === "undefined" || typeof document === "undefined") {
    return {
      cleanup: () => {},
      isReady: false,
      getActiveState: () => null
    };
  }

  /**
   * Resolves a DOM element from a string selector or element reference.
   *
   * @param {HTMLElement|string} ref - The selector or element.
   * @returns {HTMLElement|null} - The resolved element or null.
   */
  const resolveElement = (ref) => (typeof ref === "string" ? document.querySelector(ref) : ref);

  const mountEl = resolveElement(mount);
  const announcerEl = resolveElement(announcer);

  if (!mountEl || !announcerEl) {
    return {
      cleanup: () => {},
      isReady: false,
      getActiveState: () => null
    };
  }

  const rootEl = document.createElement("ul");
  rootEl.id = "battle-state-indicator";
  rootEl.dataset.flag = "battleStateIndicator";
  rootEl.setAttribute("aria-label", "Battle progress");

  const announcerP = document.createElement("p");
  announcerP.id = "battle-state-announcer";
  announcerP.dataset.flag = "battleStateAnnouncer";
  announcerP.setAttribute("aria-live", "polite");
  announcerP.setAttribute("aria-atomic", "true");

  mountEl.appendChild(rootEl);
  announcerEl.appendChild(announcerP);

  let catalog;
  try {
    catalog = await getCatalog();
  } catch (error) {
    console.error("Failed to fetch state catalog:", error);
    return {
      cleanup: () => {
        if (rootEl.parentNode) mountEl.removeChild(rootEl);
        if (announcerP.parentNode) announcerEl.removeChild(announcerP);
      },
      isReady: false,
      getActiveState: () => null
    };
  }

  // Validate catalog structure
  if (!catalog?.display?.include || !Array.isArray(catalog.display.include)) {
    console.warn("Invalid catalog structure: missing or invalid display.include");
    return {
      cleanup: () => {
        if (rootEl.parentNode) mountEl.removeChild(rootEl);
        if (announcerP.parentNode) announcerEl.removeChild(announcerP);
      },
      isReady: false,
      getActiveState: () => null
    };
  }

  let activeState = null;
  let currentCatalog = catalog;
  let catalogRefreshPending = false;
  const STATE_ALIASES = {
    roundWait: "cooldown",
    cooldown: "roundWait"
  };

  /**
   * Resolves known state aliases with exact key precedence.
   *
   * @param {string} stateName - The raw state name.
   * @param {Record<string, string|number>} map - The catalog map to query.
   * @returns {string|number|undefined} - Matched value, preferring exact key.
   */
  const resolveStateValue = (stateName, map) => {
    if (!map) {
      return undefined;
    }
    if (Object.hasOwn(map, stateName)) {
      return map[stateName];
    }
    const alias = STATE_ALIASES[stateName];
    if (alias && Object.hasOwn(map, alias)) {
      return map[alias];
    }
    return undefined;
  };

  /**
   * Resolves a state label from the catalog.
   *
   * @param {string} stateName - The raw state name.
   * @returns {string} - The display label or the raw state name.
   */
  const getStateLabel = (stateName) =>
    resolveStateValue(stateName, currentCatalog.labels) || stateName;

  /**
   * Updates the unknown state flag on the root element.
   *
   * @param {boolean} stateExists - Whether the state exists in the catalog.
   */
  const updateUnknownState = (stateExists) => {
    if (!stateExists) {
      rootEl.dataset.unknown = "true";
    } else {
      delete rootEl.dataset.unknown;
    }
  };

  /**
   * Renders the state list using a DocumentFragment to minimize reflows.
   */
  const renderList = () => {
    const fragment = document.createDocumentFragment();
    currentCatalog.display.include.forEach((stateName) => {
      const li = document.createElement("li");
      li.dataset.stateRaw = stateName;
      const stateId = resolveStateValue(stateName, currentCatalog.ids);
      if (stateId !== undefined) {
        li.dataset.stateId = stateId;
      }
      const label = getStateLabel(stateName);
      if (label !== stateName) {
        li.dataset.stateLabel = label;
      }
      li.textContent = label;
      fragment.appendChild(li);
    });
    rootEl.innerHTML = "";
    rootEl.appendChild(fragment);
  };

  renderList();

  /**
   * Updates the active state and UI elements when state changes.
   * Handles catalog refresh asynchronously without blocking UI updates.
   *
   * @param {string} to - The new state.
   * @param {string} catalogVersion - The catalog version.
   */
  const handleStateChange = ({ to, catalogVersion }) => {
    // Handle catalog refresh asynchronously without blocking UI updates (fire-and-forget)
    if (catalogVersion && catalogVersion !== currentCatalog.version && !catalogRefreshPending) {
      catalogRefreshPending = true;
      getCatalog()
        .then((newCatalog) => {
          currentCatalog = newCatalog;
          renderList();
        })
        .catch((error) => {
          console.error("Failed to refresh catalog:", error);
        })
        .finally(() => {
          catalogRefreshPending = false;
        });
    }

    activeState = to;
    announcerP.textContent = `State: ${to}`;

    const stateExistsInCatalog = currentCatalog.display.include.includes(to);
    updateUnknownState(stateExistsInCatalog);

    const previousActive = rootEl.querySelector("li.active");
    const newActive = rootEl.querySelector(`li[data-state-raw="${to}"]`);

    if (previousActive) {
      previousActive.classList.remove("active");
      previousActive.removeAttribute("aria-current");
    }

    if (newActive) {
      newActive.classList.add("active");
      newActive.setAttribute("aria-current", "step");
    }
  };

  events.on("control.state.changed", handleStateChange);

  return {
    cleanup: () => {
      events.off("control.state.changed", handleStateChange);
      if (rootEl.parentNode) mountEl.removeChild(rootEl);
      if (announcerP.parentNode) announcerEl.removeChild(announcerP);
    },
    isReady: true,
    getActiveState: () => activeState
  };
}
