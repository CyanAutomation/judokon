import { buildCardCarousel, addScrollMarkers } from "./carouselBuilder.js";
import { populateCountryList } from "./countryUtils.js";
import { toggleCountryPanel, toggleCountryPanelMode } from "./countryPanel.js";
import { fetchJson } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";
import { createButton } from "../components/Button.js";
import { onDomReady } from "./domReady.js";

/**
 * Initialize the Browse Judoka page.
 *
 * @pseudocode
 * 1. Grab DOM elements for the carousel and country filters.
 * 2. Load judoka and gokyo data from JSON files.
 * 3. Render the card carousel with the loaded data.
 * 4. Attach event listeners for filtering and panel controls.
 * 5. Handle errors by showing a retry button when loading fails.
 */
export function setupBrowseJudokaPage() {
  const carouselContainer = document.getElementById("carousel-container");
  const countryListContainer = document.getElementById("country-list");
  const toggleBtn = document.getElementById("country-toggle");
  const layoutToggle = document.getElementById("layout-toggle");
  const countryPanel = document.getElementById("country-panel");

  toggleCountryPanelMode(countryPanel, true);

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
   * 1. Clear the existing carousel container.
   * 2. Use `buildCardCarousel` to create carousel markup.
   * 3. Append the carousel to the container and add scroll markers.
   *
   * @param {Judoka[]} list - Judoka to display.
   * @returns {Promise<void>} Resolves when rendering completes.
   */
  async function renderCarousel(list) {
    carouselContainer.innerHTML = "";
    const carousel = await buildCardCarousel(list, gokyoData);
    carouselContainer.appendChild(carousel);

    requestAnimationFrame(() => {
      const containerEl = carousel.querySelector(".card-carousel");
      if (containerEl) {
        addScrollMarkers(containerEl, carousel);
      }
    });
  }

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

  function highlightSelection(button) {
    const buttons = countryListContainer.querySelectorAll("button.flag-button");
    buttons.forEach((b) => b.classList.remove("selected"));
    button.classList.add("selected");
  }

  /**
   * Attach event listeners for the page controls.
   *
   * @pseudocode
   * 1. Toggle the country panel and populate it on first open.
   * 2. Switch panel layout when the layout toggle is clicked.
   * 3. Support keyboard navigation inside the panel.
   * 4. Filter judoka when a country button is clicked.
   * 5. Clear filters and close the panel when requested.
   */
  function attachEventListeners() {
    let countriesLoaded = false;

    toggleBtn.addEventListener("click", async () => {
      const wasOpen = countryPanel.classList.contains("open");
      toggleCountryPanel(toggleBtn, countryPanel);
      if (!wasOpen && !countriesLoaded) {
        await populateCountryList(countryListContainer);
        countriesLoaded = true;
      }
    });

    if (layoutToggle) {
      layoutToggle.addEventListener("click", () => toggleCountryPanelMode(countryPanel));
    }

    countryPanel.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        toggleCountryPanel(toggleBtn, countryPanel, false);
      }

      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        handleKeyboardNavigation(e, countryListContainer, "flag-button");
      }
    });

    const clearBtn = document.getElementById("clear-filter");
    clearBtn.addEventListener("click", async () => {
      const buttons = countryListContainer.querySelectorAll("button.flag-button");
      buttons.forEach((b) => b.classList.remove("selected"));
      await renderCarousel(allJudoka);
      toggleCountryPanel(toggleBtn, countryPanel, false);
    });

    countryListContainer.addEventListener("click", async (e) => {
      const button = e.target.closest("button.flag-button");
      if (!button) return;
      const selected = button.value;
      highlightSelection(button);
      const filtered =
        selected === "all" ? allJudoka : allJudoka.filter((j) => j.country === selected);
      await renderCarousel(filtered);
      const existingMessage = carouselContainer.querySelector(".no-results-message");
      if (existingMessage) {
        existingMessage.remove();
      }
      if (filtered.length === 0) {
        const noResultsMessage = document.createElement("div");
        noResultsMessage.className = "no-results-message";
        noResultsMessage.setAttribute("role", "status");
        noResultsMessage.setAttribute("aria-live", "polite");
        noResultsMessage.textContent = "No judoka available for this country";
        carouselContainer.appendChild(noResultsMessage);
      }
      toggleCountryPanel(toggleBtn, countryPanel, false);
    });
  }

  async function init() {
    try {
      await loadData();
      await renderCarousel(allJudoka);
      if (allJudoka.length === 0) {
        const noResultsMessage = document.createElement("div");
        noResultsMessage.className = "no-results-message";
        noResultsMessage.setAttribute("role", "status");
        noResultsMessage.setAttribute("aria-live", "polite");
        noResultsMessage.textContent = "No judoka available.";
        carouselContainer.appendChild(noResultsMessage);
      }
    } catch (error) {
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

    attachEventListeners();
  }

  init();
}

onDomReady(setupBrowseJudokaPage);
