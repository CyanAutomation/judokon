/**
 * Creates a battle state indicator UI component that reflects the state of the battle engine's FSM.
 *
 * @pseudocode
 * 1. If the feature flag is disabled or DOM is unavailable, return a no-op API with isReady=false.
 * 2. Resolve `mount` and `announcer` to DOM elements; if missing return a no-op API.
 * 3. Create a root `<ul>` and an ARIA announcer `<p>`, append both to the provided mount points.
 * 4. Fetch the state `catalog` via `getCatalog()` and render the list of known states.
 * 5. Subscribe to `control.state.changed` events and on each change:
 *    - Refresh catalog when a new version is indicated.
 *    - Update `activeState`, mark the matching list item as active and set `aria-current`.
 *    - Update the announcer text and manage an `unknown` flag when state is not in the catalog.
 * 6. Return an API with `cleanup()`, `isReady: true`, and `getActiveState()`.
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

  const mountEl = typeof mount === "string" ? document.querySelector(mount) : mount;
  const announcerEl = typeof announcer === "string" ? document.querySelector(announcer) : announcer;

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

  const catalog = await getCatalog();

  let activeState = null;
  let currentCatalog = catalog;

  const renderList = () => {
    rootEl.innerHTML = "";
    currentCatalog.display.include.forEach((stateName) => {
      const li = document.createElement("li");
      li.dataset.stateRaw = stateName;
      li.dataset.stateId = currentCatalog.ids[stateName];
      if (currentCatalog.labels && currentCatalog.labels[stateName]) {
        li.dataset.stateLabel = currentCatalog.labels[stateName];
      }
      li.textContent = (currentCatalog.labels && currentCatalog.labels[stateName]) || stateName;
      rootEl.appendChild(li);
    });
  };

  renderList();

  const handleStateChange = async ({ to, catalogVersion }) => {
    if (catalogVersion && catalogVersion !== currentCatalog.version) {
      currentCatalog = await getCatalog();
      renderList();
    }

    activeState = to;
    announcerP.textContent = `State: ${to}`;

    const stateExistsInCatalog = currentCatalog.display.include.includes(to);
    if (!stateExistsInCatalog) {
      rootEl.dataset.unknown = "true";
    } else {
      delete rootEl.dataset.unknown;
    }

    Array.from(rootEl.children).forEach((li) => {
      if (li.dataset.stateRaw === to) {
        li.classList.add("active");
        li.setAttribute("aria-current", "step");
      } else {
        li.classList.remove("active");
        li.removeAttribute("aria-current");
      }
    });
  };

  events.on("control.state.changed", handleStateChange);

  return {
    cleanup: () => {
      events.off("control.state.changed", handleStateChange);
      mountEl.removeChild(rootEl);
      announcerEl.removeChild(announcerP);
    },
    isReady: true,
    getActiveState: () => activeState
  };
}
