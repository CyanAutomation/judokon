import { buildCardCarousel, initScrollMarkers, createLoadingSpinner } from "./carouselBuilder.js";
import { toggleCountryPanelMode } from "./countryPanel.js";
import { fetchJson } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";
import { getFallbackJudoka } from "./judokaUtils.js";
import { createButton } from "../components/Button.js";
import { onDomReady } from "./domReady.js";
import { initTooltips } from "./tooltip.js";
import { setupButtonEffects } from "./buttonEffects.js";
import { setupCountryToggle } from "./browse/setupCountryToggle.js";
import { setupCountryFilter } from "./browse/setupCountryFilter.js";

/**
 * Attach listener to switch layout mode of country panel.
 *
 * @pseudocode
 * 1. If layoutBtn exists, add click listener to toggle panel display mode.
 *
 * @param {HTMLButtonElement} layoutBtn
 * @param {Element} panel
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
 * 2. Show a loading spinner and load judoka and gokyo data from JSON files.
 * 3. Render the card carousel, display a message if there are no judoka, and hide the spinner.
 * 4. Attach event listeners for filtering, layout toggle, and panel controls.
 * 5. Handle errors by rendering a fallback card and showing a retry button when loading fails.
 * 6. Initialize tooltips for interactive elements.
 */
export async function setupBrowseJudokaPage() {
  const carouselContainer = document.getElementById("carousel-container");
  const countryListContainer = document.getElementById("country-list");
  const toggleBtn = document.getElementById("country-toggle");
  const countryPanel = document.getElementById("country-panel");
  const layoutToggle = document.getElementById("layout-toggle");
  setupLayoutToggle(layoutToggle);

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
   * 2. Remove the loading spinner and clear the existing container.
   * 3. Append the carousel to the container and initialize scroll markers.
   * 4. Apply button ripple effects.
   *
   * @param {Judoka[]} list - Judoka to display.
   * @returns {Promise<void>} Resolves when rendering completes.
   */
  async function renderCarousel(list, gokyoData, spinnerInfo) {
    const carousel = await buildCardCarousel(list, gokyoData);
    if (spinnerInfo) {
      clearTimeout(spinnerInfo.timeoutId);
      spinnerInfo.spinner.remove();
    }
    carouselContainer.innerHTML = "";
    carouselContainer.appendChild(carousel);

    const containerEl = carousel.querySelector(".card-carousel");
    if (containerEl) {
      initScrollMarkers(containerEl, carousel);
    }

    setupButtonEffects();
  }

  async function init() {
    const spinnerInfo = createLoadingSpinner(carouselContainer);
    try {
      const { allJudoka, gokyoData } = await loadData();
      const render = (list) => renderCarousel(list, gokyoData);
      await renderCarousel(allJudoka, gokyoData, spinnerInfo);
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
      clearTimeout(spinnerInfo.timeoutId);
      spinnerInfo.spinner.remove();
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
          await renderCarousel([fallbackRetry], [], undefined);
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

onDomReady(setupBrowseJudokaPage);
