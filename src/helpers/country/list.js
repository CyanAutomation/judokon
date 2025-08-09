import { DATA_DIR } from "../constants.js";
import { loadCountryCodeMapping, getFlagUrl } from "./codes.js";

const SCROLL_THRESHOLD_PX = 50;

/**
 * Populate a scrolling list of active countries with flag buttons.
 *
 * @pseudocode
 * 1. Fetch `judoka.json` to determine which countries appear in the deck.
 * 2. Load the country code mapping and build a sorted list of active entries.
 * 3. If no active countries exist, show a message and exit.
 * 4. Determine batch size based on network conditions.
 * 5. Render an "All" button followed by batches of country buttons with lazily loaded flags.
 * 6. Use `IntersectionObserver` and `loading="lazy"` to defer flag requests until visible.
 * 7. Log errors if data fails to load or individual flags cannot be retrieved.
 *
 * @param {HTMLElement} container - Element where buttons will be appended.
 * @returns {Promise<void>} Resolves when the list is populated.
 */
export async function populateCountryList(container) {
  try {
    const judokaResponse = await fetch(`${DATA_DIR}judoka.json`);
    if (!judokaResponse.ok) {
      throw new Error("Failed to load judoka data");
    }
    const judoka = await judokaResponse.json();
    const uniqueCountries = new Set(
      Array.isArray(judoka) ? judoka.map((j) => j.country).filter(Boolean) : []
    );
    const mapping = await loadCountryCodeMapping();
    const entries = Object.values(mapping);
    const activeCountries = [...uniqueCountries]
      .map((name) => entries.find((entry) => entry.country === name && entry.active))
      .filter(Boolean)
      .sort((a, b) => a.country.localeCompare(b.country));

    if (activeCountries.length === 0) {
      const message = document.createElement("p");
      message.textContent = "No countries available.";
      container.replaceChildren(message);
      return;
    }

    const allButton = document.createElement("button");
    allButton.className = "flag-button slide";
    allButton.value = "all";
    allButton.setAttribute("aria-label", "Show all countries");
    const allImg = document.createElement("img");
    allImg.alt = "All countries";
    allImg.className = "flag-image";
    allImg.setAttribute("loading", "lazy");
    allImg.src = "https://flagcdn.com/w320/vu.png";
    const allLabel = document.createElement("p");
    allLabel.textContent = "All";
    allButton.appendChild(allImg);
    allButton.appendChild(allLabel);
    container.appendChild(allButton);

    const scrollContainer = container.parentElement || container;
    const connection = typeof navigator !== "undefined" ? navigator.connection : undefined;
    let BATCH_SIZE = 50;
    if (connection) {
      if (connection.saveData || /2g/.test(connection.effectiveType)) {
        BATCH_SIZE = 20;
      } else if (connection.downlink && connection.downlink < 1) {
        BATCH_SIZE = 30;
      }
    }
    let imageObserver;
    if (typeof IntersectionObserver === "function") {
      imageObserver = new IntersectionObserver(
        (entries, observer) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const img = entry.target;
              img.src = img.dataset.src;
              observer.unobserve(img);
            }
          }
        },
        { root: scrollContainer, rootMargin: "100px" }
      );
    }
    let rendered = 0;
    const renderBatch = async () => {
      const batch = activeCountries.slice(rendered, rendered + BATCH_SIZE);
      for (const country of batch) {
        if (!country.country || !country.code) {
          console.warn("Skipping invalid country entry:", country);
          continue;
        }
        const button = document.createElement("button");
        button.className = "flag-button slide";
        button.value = country.country;
        button.setAttribute("aria-label", `Filter by ${country.country}`);
        const flagImg = document.createElement("img");
        flagImg.alt = `${country.country} Flag`;
        flagImg.className = "flag-image";
        flagImg.setAttribute("loading", "lazy");
        try {
          const flagUrl = await getFlagUrl(country.code);
          if (imageObserver) {
            flagImg.dataset.src = flagUrl;
            imageObserver.observe(flagImg);
          } else {
            flagImg.src = flagUrl;
          }
        } catch (error) {
          console.warn(`Failed to load flag for ${country.country}:`, error);
          flagImg.src = "https://flagcdn.com/w320/vu.png";
        }
        const countryName = document.createElement("p");
        countryName.textContent = country.country;
        button.appendChild(flagImg);
        button.appendChild(countryName);
        container.appendChild(button);
      }
      rendered += batch.length;
    };

    await renderBatch();
    if (activeCountries.length > rendered) {
      const handleScroll = async () => {
        if (
          scrollContainer.scrollTop + scrollContainer.clientHeight >=
          scrollContainer.scrollHeight - SCROLL_THRESHOLD_PX
        ) {
          await renderBatch();
          if (rendered >= activeCountries.length) {
            scrollContainer.removeEventListener("scroll", handleScroll);
          }
        }
      };
      scrollContainer.addEventListener("scroll", handleScroll);
    }
  } catch (error) {
    console.error("Error fetching country data:", error);
  }
}
