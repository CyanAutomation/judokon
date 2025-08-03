import { buildCardCarousel, addScrollMarkers, createLoadingSpinner } from "./carouselBuilder.js";
import { createCountrySlider } from "./countrySlider.js";
import { toggleCountryPanel, toggleCountryPanelMode } from "./countryPanel.js";
import { fetchJson } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";
import { createButton } from "../components/Button.js";
import { onDomReady } from "./domReady.js";
import { initTooltips } from "./tooltip.js";
import { setupButtonEffects } from "./buttonEffects.js";

function handleKeyboardNavigation(event, container, buttonClass) {
  const buttons = Array.from(container.querySelectorAll(`button.${buttonClass}`));
  const current = document.activeElement;
  const index = buttons.indexOf(current);
  if (index !== -1) {
    event.preventDefault();
    const offset = event.key === "ArrowRight" ? 1 : -1;
    const next = (index + offset + buttons.length) % buttons.length;
    buttons[next].focus();
  }
}

function highlightSelection(container, button) {
  const buttons = container.querySelectorAll("button.flag-button");
  buttons.forEach((b) => b.classList.remove("selected"));
  button.classList.add("selected");
}

export function setupCountryToggle(toggleButton, panel, listContainer) {
  let countriesLoaded = false;

  toggleButton.addEventListener("click", async () => {
    const wasOpen = panel.classList.contains("open");
    toggleCountryPanel(toggleButton, panel);
    if (!wasOpen && !countriesLoaded) {
      await createCountrySlider(listContainer);
      countriesLoaded = true;
    }
  });

  panel.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      toggleCountryPanel(toggleButton, panel, false);
    }

    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      handleKeyboardNavigation(e, listContainer, "flag-button");
    }
  });
}

export function setupLayoutToggle(layoutBtn, panel) {
  if (layoutBtn) {
    layoutBtn.addEventListener("click", () => toggleCountryPanelMode(panel));
  }
}

export function setupCountryFilter(
  listContainer,
  clearButton,
  judokaList,
  render,
  toggleButton,
  panel,
  carouselEl,
  ariaLiveEl
) {
  let liveRegion = ariaLiveEl;

  function updateLiveRegion(count, country) {
    liveRegion = carouselEl.querySelector(".carousel-aria-live") || liveRegion;
    liveRegion.textContent = `Showing ${count} judoka for ${country}`;
  }

  clearButton.addEventListener("click", async () => {
    const buttons = listContainer.querySelectorAll("button.flag-button");
    buttons.forEach((b) => b.classList.remove("selected"));
    await render(judokaList);
    updateLiveRegion(judokaList.length, "all countries");
    toggleCountryPanel(toggleButton, panel, false);
  });

  listContainer.addEventListener("click", async (e) => {
    const button = e.target.closest("button.flag-button");
    if (!button) return;
    const selected = button.value;
    highlightSelection(listContainer, button);
    const filtered =
      selected === "all" ? judokaList : judokaList.filter((j) => j.country === selected);
    await render(filtered);
    updateLiveRegion(filtered.length, selected === "all" ? "all countries" : selected);
    const existingMessage = carouselEl.querySelector(".no-results-message");
    if (existingMessage) {
      existingMessage.remove();
    }
    if (filtered.length === 0) {
      const noResultsMessage = document.createElement("div");
      noResultsMessage.className = "no-results-message";
      noResultsMessage.setAttribute("role", "status");
      noResultsMessage.setAttribute("aria-live", "polite");
      noResultsMessage.textContent = "No judoka available for this country";
      carouselEl.appendChild(noResultsMessage);
    }
    toggleCountryPanel(toggleButton, panel, false);
  });
}

/**
 * Initialize the Browse Judoka page.
 *
 * @pseudocode
 * 1. Grab DOM elements for the carousel and country filters.
 * 2. Show a loading spinner and load judoka and gokyo data from JSON files.
 * 3. Render the card carousel and hide the spinner once complete.
 * 4. Attach event listeners for filtering and panel controls.
 * 5. Handle errors by showing a retry button when loading fails.
 */
export async function setupBrowseJudokaPage() {
  const carouselContainer = document.getElementById("carousel-container");
  const countryListContainer = document.getElementById("country-list");
  const toggleBtn = document.getElementById("country-toggle");
  const layoutToggle = document.getElementById("layout-toggle");
  const countryPanel = document.getElementById("country-panel");

  // Attach event handler for layout toggle if the element exists
  if (layoutToggle) {
    layoutToggle.addEventListener("click", () => {
      carouselContainer.classList.toggle("grid-layout");
    });
  }
  toggleCountryPanelMode(countryPanel, false);

  let allJudoka = [];
  let gokyoData = [];

  /**
   * Fetch judoka and gokyo data concurrently.
   *
   * @pseudocode
   * 1. Request `judoka.json` and `gokyo.json` using `fetchJson`.
   * 2. Store the results in `allJudoka` and `gokyoData`.
   *
   * @returns {Promise<void>} Resolves when data is loaded.
   */
  async function loadData() {
    [allJudoka, gokyoData] = await Promise.all([
      fetchJson(`${DATA_DIR}judoka.json`),
      fetchJson(`${DATA_DIR}gokyo.json`)
    ]);
  }

  /**
   * Build and display the card carousel.
   *
   * @pseudocode
   * 1. Use `buildCardCarousel` to create carousel markup.
   * 2. Remove the loading spinner and clear the existing container.
   * 3. Append the carousel to the container and add scroll markers.
   * 4. Apply button ripple effects.
   *
   * @param {Judoka[]} list - Judoka to display.
   * @returns {Promise<void>} Resolves when rendering completes.
   */
  async function renderCarousel(list, spinnerInfo) {
    const carousel = await buildCardCarousel(list, gokyoData);
    if (spinnerInfo) {
      clearTimeout(spinnerInfo.timeoutId);
      spinnerInfo.spinner.remove();
    }
    carouselContainer.innerHTML = "";
    carouselContainer.appendChild(carousel);

    requestAnimationFrame(() => {
      const containerEl = carousel.querySelector(".card-carousel");
      if (containerEl) {
        addScrollMarkers(containerEl, carousel);
      }
    });

    setupButtonEffects();
  }

  async function init() {
    const spinnerInfo = createLoadingSpinner(carouselContainer);
    try {
      await loadData();
      await renderCarousel(allJudoka, spinnerInfo);
      if (allJudoka.length === 0) {
        const noResultsMessage = document.createElement("div");
        noResultsMessage.className = "no-results-message";
        noResultsMessage.setAttribute("role", "status");
        noResultsMessage.setAttribute("aria-live", "polite");
        noResultsMessage.textContent = "No judoka available.";
        carouselContainer.appendChild(noResultsMessage);
      }
    } catch (error) {
      clearTimeout(spinnerInfo.timeoutId);
      spinnerInfo.spinner.remove();
      console.error("Error building the carousel:", error);
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
          await loadData();
          await renderCarousel(allJudoka);
        } catch (err) {
          console.error("Error during retry:", err);
        } finally {
          retryButton.disabled = false;
        }
      });
      carouselContainer.appendChild(retryButton);
    }

    const clearBtn = document.getElementById("clear-filter");
    setupCountryToggle(toggleBtn, countryPanel, countryListContainer);
    setupLayoutToggle(layoutToggle, countryPanel);
    const ariaLive = carouselContainer.querySelector(".carousel-aria-live");
    setupCountryFilter(
      countryListContainer,
      clearBtn,
      allJudoka,
      renderCarousel,
      toggleBtn,
      countryPanel,
      carouselContainer,
      ariaLive
    );
  }

  await init();
  initTooltips();
}

onDomReady(setupBrowseJudokaPage);
