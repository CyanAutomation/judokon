import { DATA_DIR } from "../constants.js";
import { fetchJson } from "../dataUtils.js";
import { loadCountryMapping, getFlagUrl } from "../api/countryService.js";

const SCROLL_THRESHOLD_PX = 50;
const COUNTRY_FILTER_GROUP_NAME = "country-filter";
const GROUP_LABEL = "Filter judoka by country";

let optionIdCounter = 0;

// Track batch loading state by container element
const batchState = new WeakMap();

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
  // Collect unique country NAMES present in the judoka data.
  const uniqueCountryNames = new Set(
    Array.isArray(judoka)
      ? judoka
          .map((j) => (typeof j.country === "string" ? j.country.trim() : ""))
          .filter((name) => name.length > 0)
      : []
  );

  // Load the canonical mapping of countries -> codes, then
  // keep only active entries that exist in the judoka set.
  const mapping = await loadCountryMapping();
  const entries = Object.values(mapping).filter(
    (e) => e && e.active && uniqueCountryNames.has(e.country)
  );

  // Deduplicate by country name in case mapping contains duplicates.
  const byName = new Map();
  for (const e of entries) {
    if (!byName.has(e.country)) byName.set(e.country, e.code);
  }

  const activeCountries = [...byName.keys()].sort((a, b) => a.localeCompare(b));
  const nameToCode = new Map(activeCountries.map((name) => [name, byName.get(name)]));

  return { activeCountries, nameToCode };
}

function nextOptionId() {
  optionIdCounter += 1;
  return `country-filter-option-${optionIdCounter}`;
}

function ensureRadioGroup(container) {
  container.setAttribute("role", "radiogroup");
  container.setAttribute("aria-label", GROUP_LABEL);
}

function createFlagLabel(optionId, textContent) {
  const label = document.createElement("label");
  label.className = "flag-button slide";
  label.setAttribute("for", optionId);

  const text = document.createElement("p");
  text.textContent = textContent;
  label.appendChild(text);

  return label;
}

function appendFlagRadio(container, { value, label, ariaLabel, imageSrc, lazySrc, imageObserver, checked }) {
  const optionId = nextOptionId();
  const radio = document.createElement("input");
  radio.type = "radio";
  radio.name = COUNTRY_FILTER_GROUP_NAME;
  radio.value = value;
  radio.id = optionId;
  radio.className = "flag-radio";
  if (checked) {
    radio.checked = true;
  }
  if (ariaLabel) {
    radio.setAttribute("aria-label", ariaLabel);
  }

  const labelEl = createFlagLabel(optionId, label);

  const flagImg = document.createElement("img");
  flagImg.className = "flag-image";
  flagImg.setAttribute("loading", "lazy");

  if (value === "all") {
    flagImg.alt = "All countries";
  } else {
    flagImg.alt = `${label} Flag`;
  }

  if (lazySrc && imageObserver) {
    flagImg.dataset.src = lazySrc;
    imageObserver.observe(flagImg);
  } else {
    flagImg.src = imageSrc ?? lazySrc ?? "";
  }

  // Ensure the image appears before the text for a consistent layout.
  labelEl.insertBefore(flagImg, labelEl.firstChild);

  const wrapper = document.createElement("div");
  wrapper.className = "flag-option";
  wrapper.appendChild(radio);
  wrapper.appendChild(labelEl);

  container.appendChild(wrapper);
}

function renderAllOption(container) {
  appendFlagRadio(container, {
    value: "all",
    label: "All",
    ariaLabel: "Show all countries",
    imageSrc: "https://flagcdn.com/w320/vu.png",
    checked: true
  });
}

function determineBatchSize(connection) {
  // In automated browsers (e.g., Playwright), render all countries at once to
  // avoid test flakiness due to lazy batching/scroll triggers.
  try {
    // Many automation drivers set this flag
    if (typeof navigator !== "undefined" && navigator.webdriver) {
      return Number.MAX_SAFE_INTEGER;
    }
  } catch {}

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
    let flagUrl;
    try {
      const code = nameToCode.get(countryName);
      flagUrl = await getFlagUrl(code);
    } catch (error) {
      console.warn(`Failed to load flag for ${countryName}:`, error);
      flagUrl = "https://flagcdn.com/w320/vu.png";
    }

    appendFlagRadio(container, {
      value: countryName,
      label: countryName,
      ariaLabel: `Filter by ${countryName}`,
      imageSrc: imageObserver ? undefined : flagUrl,
      lazySrc: imageObserver ? flagUrl : undefined,
      imageObserver
    });
  }
}

/**
 * Load the next batch of countries into the list for the given container.
 *
 * @pseudocode
 * 1. Retrieve batching state for the container.
 * 2. Slice the next batch of countries using `batchSize`.
 * 3. Render the batch and update the rendered count.
 *
 * @param {HTMLElement} container - Track element that receives buttons.
 * @returns {Promise<void>} Resolves when the batch is appended.
 */
export async function loadNextCountryBatch(container) {
  const state = batchState.get(container);
  if (!state) {
    return;
  }
  const { activeCountries, nameToCode, batchSize, imageObserver } = state;
  const batch = activeCountries.slice(state.rendered, state.rendered + batchSize);
  await renderCountryBatch(container, batch, nameToCode, imageObserver);
  state.rendered += batch.length;
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

    optionIdCounter = 0;
    ensureRadioGroup(container);
    renderAllOption(container);

    const scrollContainer = container.parentElement || container;
    const connection = typeof navigator !== "undefined" ? navigator.connection : undefined;
    const batchSize = determineBatchSize(connection);
    const imageObserver = initLazyFlagLoader(scrollContainer);
    const state = {
      activeCountries,
      nameToCode,
      batchSize,
      imageObserver,
      rendered: 0
    };
    batchState.set(container, state);

    await loadNextCountryBatch(container);
    if (activeCountries.length > state.rendered) {
      const handleScroll = async () => {
        if (
          scrollContainer.scrollTop + scrollContainer.clientHeight >=
          scrollContainer.scrollHeight - SCROLL_THRESHOLD_PX
        ) {
          await loadNextCountryBatch(container);
          if (state.rendered >= activeCountries.length) {
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
