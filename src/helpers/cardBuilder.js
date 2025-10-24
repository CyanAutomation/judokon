import { getFlagUrl } from "./country/codes.js";
import { safeGenerate } from "./errorUtils.js";
import { getMissingJudokaFields, hasRequiredJudokaFields } from "./judokaValidation.js";
import { cardSectionRegistry } from "./cardSections.js";
import { createInspectorPanel } from "./inspector/createInspectorPanel.js";
import { markSignatureMoveReady } from "./signatureMove.js";

const FALLBACK_FLAG_URL = "https://flagcdn.com/w320/vu.png";

function createFlipToggleId(seed) {
  const unique =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `card-flip-toggle-${seed ?? "card"}-${unique}`;
}

function createFlipToggleElement(toggleId) {
  const toggle = document.createElement("input");
  toggle.type = "checkbox";
  toggle.className = "card-flip-toggle";
  toggle.id = toggleId;
  toggle.setAttribute("aria-label", "Flip card to view back");
  toggle.tabIndex = -1;
  return toggle;
}

function createJudokaCardLabel(judoka, cardType, toggleId, inspectorState) {
  const judokaCard = document.createElement("label");
  judokaCard.className = `card judoka-card ${cardType}`;
  judokaCard.htmlFor = toggleId;
  judokaCard.setAttribute("role", "button");
  judokaCard.setAttribute("tabindex", "0");
  const fullName = [judoka.firstname, judoka.surname].filter(Boolean).join(" ").trim();
  const ariaLabel = fullName ? `${fullName} card` : "Judoka card";
  judokaCard.setAttribute("aria-label", ariaLabel);
  judokaCard.classList.add(judoka.gender === "female" ? "female-card" : "male-card");
  judokaCard.setAttribute("data-feature-card-inspector", inspectorState);
  return judokaCard;
}

function attachKeyboardToggle(card, toggle) {
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle.click();
      queueMicrotask(() => {
        if (typeof card.focus === "function") {
          card.focus({ preventScroll: true });
        }
      });
    }
  });
}

function createCardContainer(judoka, inspectorState) {
  const cardContainer = document.createElement("div");
  cardContainer.className = "card-container";
  cardContainer.setAttribute("data-feature-card-inspector", inspectorState);
  try {
    cardContainer.dataset.cardJson = JSON.stringify(judoka);
  } catch {
    // Ignore serialization errors; inspector will render a fallback
  }
  return cardContainer;
}

async function appendJudokaSections(judokaCard, judoka, gokyoLookup, cardType, flagUrl) {
  for (const buildSection of cardSectionRegistry) {
    const section = await buildSection(judoka, { flagUrl, gokyoLookup, cardType });
    judokaCard.appendChild(section);
  }
}

async function resolveFlagUrl(judoka) {
  return await safeGenerate(
    () => getFlagUrl(judoka.countryCode || "vu"),
    "Failed to resolve flag URL:",
    FALLBACK_FLAG_URL
  );
}

/**
 * Generates the "last updated" HTML for a judoka card.
 *
 * @pseudocode
 * 1. Check if the `date` parameter is provided:
 *    - If `date` is undefined or falsy, return an empty string.
 *
 * 2. Format the date:
 *    - If `date` is a `Date` object, convert it to "YYYY-MM-DD" format.
 *    - If `date` is a string, use it as-is.
 *
 * 3. Sanitize the date string to prevent XSS attacks:
 *    - Use the `escapeHTML` function to sanitize the date string.
 *
 * 4. Generate the HTML for the "last updated" section:
 *    - Wrap the sanitized date in a `<div>` with the class `card-updated`.
 *
 * @param {string|Date|undefined} date - The last updated date as a string or Date.
 * @returns {string} The HTML string for the "last updated" section.
 */
// function generateCardLastUpdated(date) {
//   if (!date) return ""; // If date is undefined, don't render anything
//   const safeDate = date instanceof Date ? date.toISOString().split("T")[0] : date;
//   return `<div class="card-updated">Last updated: ${escapeHTML(safeDate)}</div>`;
// }

/**
 * Build and return a DOM container for a judoka card.
 *
 * @pseudocode
 * 1. Validate inputs and resolve the judoka's flag URL.
 * 2. Create a visually hidden checkbox toggle and label-based `.judoka-card` element tied together.
 * 3. Populate the card sections from `cardSectionRegistry` and attach keyboard flipping support.
 * 4. Append the optional inspector panel when enabled and return the populated container.
 *
 * @param {import("./types.js").Judoka} judoka - Judoka data with required fields such as names, country codes, stats and signatureMoveId.
 * @param {Record<number, import("./types.js").GokyoEntry>} gokyoLookup - Map of technique ids to technique details. Missing lookups result in fallback content.
 * @returns {HTMLElement} Container element containing the completed card.
 */
export async function generateJudokaCardHTML(judoka, gokyoLookup, options = {}) {
  const { enableInspector = false } = options;
  if (!judoka || !gokyoLookup) {
    const fallback = document.createElement("div");
    fallback.textContent = "No data available";
    return fallback;
  }

  const missing = getMissingJudokaFields(judoka);
  if (!hasRequiredJudokaFields(judoka)) {
    throw new Error(`Invalid Judoka object: Missing required fields: ${missing.join(", ")}`);
  }

  const flagUrl = await resolveFlagUrl(judoka);
  const cardType = judoka.rarity?.toLowerCase() || "common";
  const inspectorState = enableInspector ? "enabled" : "disabled";

  const cardContainer = createCardContainer(judoka, inspectorState);
  const toggleId = createFlipToggleId(judoka.id);
  const flipToggle = createFlipToggleElement(toggleId);
  const judokaCard = createJudokaCardLabel(judoka, cardType, toggleId, inspectorState);

  await appendJudokaSections(judokaCard, judoka, gokyoLookup, cardType, flagUrl);
  attachKeyboardToggle(judokaCard, flipToggle);

  cardContainer.append(flipToggle, judokaCard);

  if (enableInspector) {
    const panel = createInspectorPanel(cardContainer, judoka);
    cardContainer.appendChild(panel);
  }

  return cardContainer;
}

/**
 * Generates a single judoka card and appends it to the container.
 *
 * @pseudocode
 * 1. Asynchronously generate the `card` HTML element:
 *    a. Use `safeGenerate()` to call `generateJudokaCardHTML()` with the provided `judoka`, `gokyoLookup`, and `options`.
 *    b. Provide a descriptive error message including the judoka's first and last name.
 *    c. Specify `null` as the fallback value if `generateJudokaCardHTML` throws an error.
 * 2. If a `card` element is successfully returned:
 *    a. Check if the `card` contains an element with the class ".signature-move-container".
 *    b. If such an element exists, call `markSignatureMoveReady()` to perform any necessary actions related to the signature move.
 * 3. Return the generated `card` element (or `null` if generation failed).
 *
 * @param {Object} judoka - A judoka object containing data for the card.
 * @param {Object} gokyoLookup - A lookup object for gokyo data.
 * @param {HTMLElement} container - The container to append the card to.
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
/**
 * Generate and return a judoka card element for display.
 *
 * @summary Build a judoka card DOM element from `judoka` and append to an optional container.
 * @pseudocode
 * 1. Use `safeGenerate()` to call `generateJudokaCardHTML()` and catch errors.
 * 2. If a card element is produced, check for a signature move container and call `markSignatureMoveReady()`.
 * 3. Return the generated card element or `null` if generation failed.
 *
 * @param {Object} judoka - Judoka data object.
 * @param {Object} gokyoLookup - Lookup data for gokyo techniques.
 * @param {HTMLElement} [container] - Optional container to append the card to.
 * @param {Object} [options] - Optional generation options (e.g., enableInspector).
 * @returns {Promise<HTMLElement|null>} The generated card element or null on failure.
 */
export async function generateJudokaCard(judoka, gokyoLookup, container, options = {}) {
  const card = await safeGenerate(
    () => generateJudokaCardHTML(judoka, gokyoLookup, options),
    `Error generating card for judoka: ${judoka.firstname} ${judoka.surname}`,
    null
  );
  if (card) {
    if (card.querySelector(".signature-move-container")) {
      markSignatureMoveReady();
    }
  }
  return card;
}
