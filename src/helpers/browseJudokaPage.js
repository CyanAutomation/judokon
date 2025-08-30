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
 * Attach listener to switch layout mode of country panel.
 *
 * @pseudocode
 * 1. If layoutBtn exists, add click listener to toggle panel display mode.
 *
 * @param {HTMLButtonElement} layoutBtn
 * @param {Element} panel
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
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
 * 1. Grab DOM elements for the carousel, layout toggle, and country filters.
 * 2. Show a loading spinner (immediately when `forceSpinner` flag is set) and load judoka and gokyo data from JSON files.
 * 3. Render the card carousel, display a message if there are no judoka, and hide the spinner.
 * 4. Attach event listeners for filtering, layout toggle, and panel controls.
 * 5. Handle errors by rendering a fallback card and showing a retry button when loading fails.
 * 6. Initialize tooltips for interactive elements.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export async function setupBrowseJudokaPage() {
  const carouselContainer = document.getElementById("carousel-container");
  if (!carouselContainer) {
    console.error("Carousel container not found. Cannot set up browse Judoka page.");
    if (resolveBrowseReady) {
      resolveBrowseReady(); // Resolve the promise to prevent test timeouts
    }
    return;
  }
  const countryListContainer = document.getElementById("country-list");
  const toggleBtn = document.getElementById("country-toggle");
  const countryPanel = document.getElementById("country-panel");
  const layoutToggle = document.getElementById("layout-toggle");

  // Ensure panel starts hidden so automated tests and assistive tech see the
  // expected initial state.
  countryPanel.setAttribute("hidden", "");
  toggleCountryPanelMode(countryPanel, false);

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

  /**
   * Build and display the card carousel.
   *
   * @pseudocode
   * 1. Use `buildCardCarousel` to create carousel markup.
   * 2. Clear the existing container and append the carousel.
   * 3. Initialize scroll markers on the carousel container.
   * 4. Apply button ripple effects.
   * 5. Add hover zoom markers to cards.
   *
   * @param {Judoka[]} list - Judoka to display.
   * @returns {Promise<void>} Resolves when rendering completes.
   */
  async function renderCarousel(list, gokyoData) {
    const carousel = await buildCardCarousel(list, gokyoData);
    carouselContainer.innerHTML = "";
    carouselContainer.appendChild(carousel);

    const containerEl = carousel.querySelector(".card-carousel");
    if (containerEl) {
      initScrollMarkers(containerEl, carousel);
    }

    setupButtonEffects();
    addHoverZoomMarkers();
  }

  async function init() {
    const forceSpinner =
      new URLSearchParams(globalThis.location?.search || "").has("forceSpinner") ||
      globalThis.__forceSpinner__ === true ||
      globalThis.__showSpinnerImmediately__ === true;
    const spinner = createSpinner(carouselContainer, {
      delay: forceSpinner ? 0 : undefined
    });
    spinner.show();
    if (forceSpinner) {
      spinner.element.style.display = "block";
    }
    try {
      const { allJudoka, gokyoData } = await loadData();
      const render = (list) => renderCarousel(list, gokyoData);
      await renderCarousel(allJudoka, gokyoData);
      resolveBrowseReady?.();
      spinner.remove();
      if (forceSpinner) {
        delete globalThis.__forceSpinner__;
        delete globalThis.__showSpinnerImmediately__;
      }
      if (allJudoka.length === 0) {
        const noResultsMessage = document.createElement("div");
        noResultsMessage.className = "no-results-message";
        noResultsMessage.setAttribute("role", "status");
        noResultsMessage.setAttribute("aria-live", "polite");
        noResultsMessage.textContent = "No judoka available.";
        carouselContainer.appendChild(noResultsMessage);
      }

      const clearBtn = document.getElementById("clear-filter");
      setupCountryToggle(toggleBtn, countryPanel, countryListContainer);
      setupLayoutToggle(layoutToggle, countryPanel);
      const ariaLive = carouselContainer.querySelector(".carousel-aria-live");
      setupCountryFilter(
        countryListContainer,
        clearBtn,
        allJudoka,
        render,
        toggleBtn,
        countryPanel,
        carouselContainer,
        ariaLive
      );
    } catch (error) {
      resolveBrowseReady?.();
      spinner.remove();
      if (forceSpinner) {
        delete globalThis.__forceSpinner__;
        delete globalThis.__showSpinnerImmediately__;
      }
      console.error("Error building the carousel:", error);

      const fallback = await getFallbackJudoka();
      await renderCarousel([fallback], [], undefined);

      const errorMessage = document.createElement("div");
      errorMessage.className = "error-message";
      errorMessage.setAttribute("role", "alert");
      errorMessage.setAttribute("aria-live", "assertive");
      errorMessage.textContent = "Unable to load roster.";
      carouselContainer.appendChild(errorMessage);

      const retryButton = createButton("Retry", {
        className: "retry-button",
        type: "button"
      });
      retryButton.setAttribute("aria-label", "Retry loading judoka data");
      retryButton.addEventListener("click", async () => {
        retryButton.disabled = true;
        try {
          const data = await loadData();
          await renderCarousel(data.allJudoka, data.gokyoData);
        } catch (err) {
          console.error("Error during retry:", err);
          const fallbackRetry = await getFallbackJudoka();
          await renderCarousel([fallbackRetry], []);
        } finally {
          retryButton.disabled = false;
        }
      });
      carouselContainer.appendChild(retryButton);
      return;
    }
  }

  await init();
  initTooltips();
}

setupBrowseJudokaPage();
