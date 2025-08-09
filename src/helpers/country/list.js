import { DATA_DIR } from "../constants.js";
import { fetchJson } from "../dataUtils.js";
import { loadCountryMapping, getFlagUrl } from "../api/countryService.js";

const SCROLL_THRESHOLD_PX = 50;

/**
 * Populate a scrolling list of active countries with flag buttons.
 *
 * @pseudocode
 * 1. Load judoka data via `fetchJson` to determine countries used in the deck.
 * 2. Call `loadCountryMapping` and derive sorted active country names.
 * 3. Filter to the countries present in the deck; show a message and exit when empty.
 * 4. Determine batch size based on network conditions.
 * 5. Render an "All" button followed by batches of country buttons with lazily loaded flags.
 * 6. Use `getFlagUrl(code)` to build flag URLs from the mapping.
 * 7. Use `IntersectionObserver` and `loading="lazy"` to defer flag requests until visible.
 * 8. Log errors if data fails to load or individual flags cannot be retrieved.
 *
 * @param {HTMLElement} container - Element where buttons will be appended.
 * @returns {Promise<void>} Resolves when the list is populated.
 */
export async function populateCountryList(container) {
  try {
    const judoka = await fetchJson(`${DATA_DIR}judoka.json`);
    const uniqueCountries = new Set(
      Array.isArray(judoka) ? judoka.map((j) => j.country).filter(Boolean) : []
    );

    const mapping = await loadCountryMapping();
    const entries = Object.values(mapping)
      .filter((e) => e.active)
      .sort((a, b) => a.country.localeCompare(b.country));
    const activeCountries = entries
      .map((e) => e.country)
      .filter((name) => uniqueCountries.has(name));

    if (activeCountries.length === 0) {
      const message = document.createElement("p");
      message.textContent = "No countries available.";
      container.replaceChildren(message);
      return;
    }

    const nameToCode = new Map(entries.map((e) => [e.country, e.code]));

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
      for (const countryName of batch) {
        const button = document.createElement("button");
        button.className = "flag-button slide";
        button.value = countryName;
        button.setAttribute("aria-label", `Filter by ${countryName}`);
        const flagImg = document.createElement("img");
        flagImg.alt = `${countryName} Flag`;
        flagImg.className = "flag-image";
        flagImg.setAttribute("loading", "lazy");
        try {
          const code = nameToCode.get(countryName);
          const flagUrl = await getFlagUrl(code);
          if (imageObserver) {
            flagImg.dataset.src = flagUrl;
            imageObserver.observe(flagImg);
          } else {
            flagImg.src = flagUrl;
          }
        } catch (error) {
          console.warn(`Failed to load flag for ${countryName}:`, error);
          flagImg.src = "https://flagcdn.com/w320/vu.png";
        }
        const countryLabel = document.createElement("p");
        countryLabel.textContent = countryName;
        button.appendChild(flagImg);
        button.appendChild(countryLabel);
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
