import { buildCardCarousel, initScrollMarkers } from "./carouselBuilder.js";
import { createSpinner } from "../components/Spinner.js";
import { toggleCountryPanelMode } from "./countryPanel.js";
import { fetchJson } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";
import { getFallbackJudoka } from "./judokaUtils.js";
import { createButton } from "../components/Button.js";
import { initTooltips } from "./tooltip.js";
import { setupButtonEffects } from "./buttonEffects.js";
import { setupCountryToggle } from "./browse/setupCountryToggle.js";
import { setupCountryFilter } from "./browse/setupCountryFilter.js";
import { addHoverZoomMarkers } from "./setupHoverZoom.js";
import { resetBrowseTestHooks, updateBrowseTestHooksContext } from "./browse/testHooks.js";

/**
 * @typedef {object} BrowsePageRuntime
 * @property {Element|null} carouselContainer
 * @property {Element|null} countryListContainer
 * @property {HTMLButtonElement|null} toggleBtn
 * @property {HTMLButtonElement|null} layoutToggle
 * @property {Element|null} countryPanel
 * @property {HTMLButtonElement|null} clearBtn
 * @property {() => void} [ensurePanelHidden]
 * @property {() => void} [setupToggle]
 * @property {(forceSpinner: boolean) => { show: () => void, remove: () => void }} [createSpinnerController]
 * @property {(list: Array<Judoka>, gokyoData: Array) => Promise<{ carousel: Element, containerEl: Element|null }>} [renderCarousel]
 * @property {() => Element|null} [getAriaLive]
 * @property {() => void} [setupLayoutToggle]
 * @property {(judokaList: Array<Judoka>, render: (list: Array<Judoka>) => Promise<void> | void) => void} [setupCountryFilter]
 * @property {() => Element|null} [appendNoResultsMessage]
 * @property {() => Element|null} [appendErrorMessage]
 * @property {(onClick: () => void | Promise<void>) => HTMLButtonElement|null} [appendRetryButton]
 * @property {() => void} [markReady]
 */

let resolveBrowseReady;
export const browseJudokaReadyPromise =
  typeof document !== "undefined"
    ? new Promise((resolve) => {
        resolveBrowseReady = () => {
          document.body?.setAttribute("data-browse-judoka-ready", "true");
          document.dispatchEvent(new CustomEvent("browse-judoka-ready", { bubbles: true }));
          resolve();
        };
      })
    : Promise.resolve();

/**
 * Build the DOM runtime used by {@link setupBrowseJudokaPage}.
 *
 * @pseudocode
 * 1. Query all required DOM elements.
 * 2. Provide helpers for toggles, spinner lifecycle, carousel rendering, and message management.
 * 3. Encapsulate DOM mutations so tests can replace the runtime with lightweight stubs.
 *
 * @param {Document} [documentRef=document]
 * @returns {BrowsePageRuntime}
 */
export function createBrowsePageRuntime(documentRef = document) {
  const carouselContainer = documentRef?.getElementById?.("carousel-container") ?? null;
  const countryListContainer = documentRef?.getElementById?.("country-list") ?? null;
  const toggleBtn = documentRef?.getElementById?.("country-toggle") ?? null;
  const layoutToggle = documentRef?.getElementById?.("layout-toggle") ?? null;
  const countryPanel = documentRef?.getElementById?.("country-panel") ?? null;
  const clearBtn = documentRef?.getElementById?.("clear-filter") ?? null;

  return {
    carouselContainer,
    countryListContainer,
    toggleBtn,
    layoutToggle,
    countryPanel,
    clearBtn,
    ensurePanelHidden() {
      countryPanel?.setAttribute?.("hidden", "");
      toggleCountryPanelMode(countryPanel, false);
    },
    setupToggle() {
      setupCountryToggle(toggleBtn, countryPanel, countryListContainer);
    },
    createSpinnerController(forceSpinner) {
      const spinner = createSpinner(carouselContainer, {
        delay: forceSpinner ? 0 : undefined
      });
      return {
        show() {
          spinner.show();
          if (forceSpinner) {
            spinner.element.style.display = "block";
          }
        },
        remove() {
          spinner.remove();
        }
      };
    },
    async renderCarousel(list, gokyoData) {
      const carousel = await buildCardCarousel(list, gokyoData);
      if (carouselContainer) {
        carouselContainer.innerHTML = "";
        carouselContainer.appendChild(carousel);
      }
      const containerEl = carousel.querySelector?.(".card-carousel") ?? null;
      if (containerEl) {
        initScrollMarkers(containerEl, carousel);
      }
      setupButtonEffects();
      addHoverZoomMarkers();
      updateBrowseTestHooksContext({ container: containerEl || null, gokyoData });
      return { carousel, containerEl };
    },
    getAriaLive() {
      return carouselContainer?.querySelector?.(".carousel-aria-live") ?? null;
    },
    setupLayoutToggle() {
      setupLayoutToggle(layoutToggle, countryPanel);
    },
    setupCountryFilter(judokaList, render) {
      const ariaLive = this.getAriaLive();
      setupCountryFilter(
        countryListContainer,
        clearBtn,
        judokaList,
        render,
        toggleBtn,
        countryPanel,
        carouselContainer,
        ariaLive
      );
    },
    appendNoResultsMessage() {
      if (!carouselContainer) return null;
      const docRef = carouselContainer.ownerDocument ?? documentRef;
      const node = docRef.createElement("div");
      node.className = "no-results-message";
      node.setAttribute("role", "status");
      node.setAttribute("aria-live", "polite");
      node.textContent = "No judoka available.";
      carouselContainer.appendChild(node);
      return node;
    },
    appendErrorMessage() {
      if (!carouselContainer) return null;
      const docRef = carouselContainer.ownerDocument ?? documentRef;
      const node = docRef.createElement("div");
      node.className = "error-message";
      node.setAttribute("role", "alert");
      node.setAttribute("aria-live", "assertive");
      node.textContent = "Unable to load roster.";
      carouselContainer.appendChild(node);
      return node;
    },
    appendRetryButton(onClick) {
      if (!carouselContainer) return null;
      const button = createButton("Retry", {
        className: "retry-button",
        type: "button"
      });
      button.setAttribute("aria-label", "Retry loading judoka data");
      button.addEventListener("click", onClick);
      carouselContainer.appendChild(button);
      return button;
    },
    markReady() {
      resolveBrowseReady?.();
    }
  };
}

/**
 * Attach listener to switch layout mode of country panel.
 *
 * @pseudocode
 * 1. If layoutBtn exists, add click listener to toggle panel display mode.
 *
 * @param {HTMLButtonElement} layoutBtn - Toggle button.
 * @param {Element} panel - Panel element to switch layout.
 * @returns {void}
 */
export function setupLayoutToggle(layoutBtn, panel) {
  if (layoutBtn) {
    layoutBtn.addEventListener("click", () => toggleCountryPanelMode(panel));
  }
}

/**
 * Initialize the Browse Judoka page.
 *
 * @pseudocode
 * 1. Get references to essential DOM elements (carousel container, country list, etc.).
 * 2. If the main carousel container is missing, log an error and exit.
 * 3. Set up the country panel toggle functionality.
 * 4. Define an `init` function to orchestrate the main setup:
 *    a. Show a loading spinner.
 *    b. Fetch judoka and gokyo data concurrently.
 *    c. Render the judoka carousel with the fetched data.
 *    d. If successful, set up country filtering and layout toggles.
 *    e. If data loading fails, display an error message, a fallback judoka card, and a retry button.
 *    f. Hide the spinner when done.
 * 5. Execute the `init` function.
 * 6. Initialize all tooltips on the page.
 *
 * @param {{ runtime?: BrowsePageRuntime }} [options] - Optional runtime overrides used for testing.
 * @returns {Promise<void>} A promise that resolves when the page setup is complete.
 */
export async function setupBrowseJudokaPage({ runtime } = {}) {
  resetBrowseTestHooks();
  const pageRuntime = runtime ?? createBrowsePageRuntime();
  const { carouselContainer } = pageRuntime;

  if (!carouselContainer) {
    console.error("Carousel container not found. Cannot set up browse Judoka page.");
    pageRuntime.markReady?.();
    return;
  }
  pageRuntime.ensurePanelHidden?.();
  pageRuntime.setupToggle?.();

  /**
   * Fetch judoka and gokyo data concurrently.
   *
   * @pseudocode
   * 1. Concurrently request `judoka.json` and `gokyo.json`.
   * 2. If the judoka request fails, throw the error.
   * 3. Otherwise, return both datasets.
   *
   * @returns {Promise<{allJudoka: Judoka[], gokyoData: Array}>}
   */
  async function loadData() {
    const [judokaRes, gokyoRes] = await Promise.allSettled([
      fetchJson(`${DATA_DIR}judoka.json`),
      fetchJson(`${DATA_DIR}gokyo.json`)
    ]);

    const gokyoData = gokyoRes.status === "fulfilled" ? gokyoRes.value : [];

    if (judokaRes.status === "rejected") {
      throw judokaRes.reason;
    }
    return { allJudoka: judokaRes.value, gokyoData };
  }

  async function init() {
    const forceSpinner =
      new URLSearchParams(globalThis.location?.search || "").has("forceSpinner") ||
      globalThis.__forceSpinner__ === true ||
      globalThis.__showSpinnerImmediately__ === true;
    const spinner = pageRuntime.createSpinnerController
      ? pageRuntime.createSpinnerController(forceSpinner)
      : {
          show() {},
          remove() {}
        };
    spinner.show?.();
    try {
      const { allJudoka, gokyoData } = await loadData();
      const render = (list) => pageRuntime.renderCarousel(list, gokyoData);
      await pageRuntime.renderCarousel(allJudoka, gokyoData);
      pageRuntime.markReady?.();
      spinner.remove?.();
      if (forceSpinner) {
        delete globalThis.__forceSpinner__;
        delete globalThis.__showSpinnerImmediately__;
      }
      if (allJudoka.length === 0) {
        pageRuntime.appendNoResultsMessage?.();
      }

      pageRuntime.setupLayoutToggle?.();
      pageRuntime.setupCountryFilter?.(allJudoka, render);
    } catch (error) {
      pageRuntime.markReady?.();
      spinner.remove?.();
      if (forceSpinner) {
        delete globalThis.__forceSpinner__;
        delete globalThis.__showSpinnerImmediately__;
      }
      console.error("Error building the carousel:", error);

      const fallback = await getFallbackJudoka();
      await pageRuntime.renderCarousel([fallback], []);

      pageRuntime.appendErrorMessage?.();

      const retryButton = pageRuntime.appendRetryButton?.(async () => {
        if (!retryButton) {
          return;
        }
        retryButton.disabled = true;
        try {
          const data = await loadData();
          await pageRuntime.renderCarousel(data.allJudoka, data.gokyoData);
        } catch (err) {
          console.error("Error during retry:", err);
          const fallbackRetry = await getFallbackJudoka();
          await pageRuntime.renderCarousel([fallbackRetry], []);
        } finally {
          retryButton.disabled = false;
        }
      });
      return;
    }
  }

  await init();
  initTooltips();
  // Function is async for historical reasons; resolves when page is ready.
  return;
}

setupBrowseJudokaPage();
