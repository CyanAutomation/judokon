import { DATA_DIR } from "../constants.js";
import { fetchJson } from "../dataUtils.js";
import { loadCountryMapping, getFlagUrl } from "../api/countryService.js";

const SCROLL_THRESHOLD_PX = 50;

/**
 * Fetch and filter active countries from data files.
 *
 * @pseudocode
 * 1. Load judoka data via `fetchJson` to gather countries present in the deck.
 * 2. Retrieve the country mapping and keep only active entries.
 * 3. Sort names alphabetically and deduplicate mapping entries.
 * 4. Return a list of active country names and a map of country name to code.
 *
 * @returns {Promise<{activeCountries: string[], nameToCode: Map<string,string>}>}
 *   Active country names and lookup map for country codes.
 */
export async function fetchActiveCountries() {
  const judoka = await fetchJson(`${DATA_DIR}judoka.json`);
  const uniqueCountries = new Set(
    Array.isArray(judoka) ? judoka.map((j) => j.country).filter(Boolean) : []
  );

  const mapping = await loadCountryMapping();
  const entries = Object.values(mapping)
    .filter((e) => e.active)
    .sort((a, b) => a.country.localeCompare(b.country));
  const uniqueEntries = [...new Map(entries.map((e) => [e.country, e])).values()];
  const nameToCode = new Map(uniqueEntries.map((e) => [e.country, e.code]));
  const activeCountries = uniqueEntries
    .map((e) => e.country)
    .filter((name) => uniqueCountries.has(name));

  return { activeCountries, nameToCode };
}

function renderAllButton(container) {
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
}

function determineBatchSize(connection) {
  let batchSize = 50;
  if (connection) {
    if (connection.saveData || /2g/.test(connection.effectiveType)) {
      batchSize = 20;
    } else if (connection.downlink && connection.downlink < 1) {
      batchSize = 30;
    }
  }
  return batchSize;
}

function initLazyFlagLoader(scrollContainer) {
  if (typeof IntersectionObserver !== "function") {
    return undefined;
  }
  return new IntersectionObserver(
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

async function renderCountryBatch(container, countries, nameToCode, imageObserver) {
  for (const countryName of countries) {
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
}

/**
 * Populate a scrolling list of active countries with flag buttons.
 *
 * @pseudocode
 * 1. Call `fetchActiveCountries` to get active names and code map.
 * 2. Show a message and exit when no active countries are returned.
 * 3. Render the "All" button.
 * 4. Determine batch size from connection info.
 * 5. Initialize a lazy flag loader via `IntersectionObserver`.
 * 6. Render batches of country buttons and attach a scroll listener for lazy loading.
 * 7. Replace contents with "No countries available." on error.
 *
 * @param {HTMLElement} container - Element where buttons will be appended.
 * @returns {Promise<void>} Resolves when the list is populated.
 */
export async function populateCountryList(container) {
  try {
    const { activeCountries, nameToCode } = await fetchActiveCountries();
    if (activeCountries.length === 0) {
      const message = document.createElement("p");
      message.textContent = "No countries available.";
      container.replaceChildren(message);
      return;
    }

    renderAllButton(container);

    const scrollContainer = container.parentElement || container;
    const connection = typeof navigator !== "undefined" ? navigator.connection : undefined;
    const BATCH_SIZE = determineBatchSize(connection);
    const imageObserver = initLazyFlagLoader(scrollContainer);
    let rendered = 0;

    const renderBatch = async () => {
      const batch = activeCountries.slice(rendered, rendered + BATCH_SIZE);
      await renderCountryBatch(container, batch, nameToCode, imageObserver);
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
    const message = document.createElement("p");
    message.textContent = "No countries available.";
    container.replaceChildren(message);
  }
}
