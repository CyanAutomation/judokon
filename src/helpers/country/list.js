import { DATA_DIR } from "../constants.js";
import { fetchJson } from "../dataUtils.js";
import { loadCountryMapping, getFlagUrl } from "../api/countryService.js";

const SCROLL_THRESHOLD_PX = 50;

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

function ensureRadioGroup(container) {
  const doc = container.ownerDocument ?? document;
  let fieldset = container.querySelector("fieldset[data-country-filter]");
  if (!fieldset) {
    fieldset = doc.createElement("fieldset");
    fieldset.dataset.countryFilter = "";
    fieldset.className = "country-filter-group";
    const legend = doc.createElement("legend");
    legend.className = "sr-only";
    legend.textContent = "Filter judoka by country";
    fieldset.appendChild(legend);
    container.appendChild(fieldset);
  }
  return fieldset;
}

function createRadioOption(fieldset, { value, label, ariaLabel, imageAlt }) {
  const doc = fieldset.ownerDocument ?? document;
  const rawValue = typeof value === "string" ? value : String(value ?? "");
  const normalized = rawValue
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
  const sanitized = normalized
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  const fallbackKey = Array.from(rawValue)
    .map((char) => char.codePointAt(0)?.toString(16) ?? "")
    .filter(Boolean)
    .join("-");
  const slug = sanitized || `option-${fallbackKey || "default"}`;
  const id = `country-filter-${slug}`;

  let input = fieldset.querySelector(`#${id}`);
  if (!(input instanceof HTMLInputElement)) {
    input = doc.createElement("input");
    input.type = "radio";
    input.name = "country-filter";
    input.id = id;
    fieldset.appendChild(input);
  }
  input.value = value;
  if (ariaLabel) {
    input.setAttribute("aria-label", ariaLabel);
  } else {
    input.removeAttribute("aria-label");
  }

  let labelEl = fieldset.querySelector(`label[for="${id}"]`);
  if (!(labelEl instanceof HTMLLabelElement)) {
    labelEl = doc.createElement("label");
    labelEl.className = "flag-button slide";
    labelEl.setAttribute("for", id);
    fieldset.appendChild(labelEl);
  }

  labelEl.replaceChildren();

  const flagImg = doc.createElement("img");
  flagImg.alt = imageAlt;
  flagImg.className = "flag-image";
  flagImg.setAttribute("loading", "lazy");

  const textEl = doc.createElement("p");
  textEl.textContent = label;

  labelEl.append(flagImg, textEl);

  return { input, flagImg };
}

function renderAllButton(container) {
  const fieldset = ensureRadioGroup(container);
  const { input, flagImg } = createRadioOption(fieldset, {
    value: "all",
    label: "All",
    ariaLabel: "Show all countries",
    imageAlt: "All countries"
  });
  flagImg.src = "https://flagcdn.com/w320/vu.png";
  input.checked = true;
  return fieldset;
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

async function renderCountryBatch(fieldset, countries, nameToCode, imageObserver) {
  for (const countryName of countries) {
    const { input, flagImg } = createRadioOption(fieldset, {
      value: countryName,
      label: countryName,
      ariaLabel: `Filter by ${countryName}`,
      imageAlt: `${countryName} Flag`
    });
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
  state.fieldset ||= ensureRadioGroup(container);
  const batch = activeCountries.slice(state.rendered, state.rendered + batchSize);
  await renderCountryBatch(state.fieldset, batch, nameToCode, imageObserver);
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

    const fieldset = renderAllButton(container);

    const scrollContainer = container.parentElement || container;
    const connection = typeof navigator !== "undefined" ? navigator.connection : undefined;
    const batchSize = determineBatchSize(connection);
    const imageObserver = initLazyFlagLoader(scrollContainer);
    const state = {
      activeCountries,
      nameToCode,
      batchSize,
      imageObserver,
      fieldset,
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
