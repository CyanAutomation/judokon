import { createInspectorPanel } from "./inspector/createInspectorPanel.js";
import { debugLog } from "./debug.js";
import { seededRandom } from "./testModeUtils.js";
import { getMissingJudokaFields, hasRequiredJudokaFields } from "./judokaValidation.js";
import { setupLazyPortraits } from "./lazyPortrait.js";
import { JudokaCard } from "../components/JudokaCard.js";

/**
 * Escape special HTML characters to prevent injection.
 *
 * @pseudocode
 * 1. Convert `value` to a string.
 * 2. Replace `&`, `<`, `>`, `"`, and `'` with their HTML entity equivalents.
 *
 * @param {unknown} value - The value to escape.
 * @returns {string} The escaped string.
 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Selects a random judoka from the provided data array.
 *
 * @pseudocode
 * 1. Validate the input data:
 *    - Ensure `data` is an array and contains valid entries.
 *    - Filter out invalid judoka objects using `hasRequiredJudokaFields`.
 *    - Throw an error if no valid entries are found.
 *
 * 2. Generate a deterministic random index:
 *    - Use `seededRandom()` to generate a reproducible random number between 0 and 1.
 *    - Multiply the random number by the length of the filtered `data` array.
 *    - Use `Math.floor()` to round down to the nearest whole number.
 *
 * 3. Select the judoka object at the generated index.
 *
 * 4. Log the selected judoka object for debugging purposes.
 *
 * 5. Return the selected judoka object.
 *
 * @param {Judoka[]} data - An array of judoka objects.
 * @returns {Judoka} A randomly selected judoka object.
 * @throws {Error} If the `data` array is invalid or contains no valid entries.
 */
export function getRandomJudoka(data) {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("No judoka data available to select.");
  }

  // Filter out invalid entries
  const validJudoka = data.filter((judoka) => hasRequiredJudokaFields(judoka));

  if (validJudoka.length === 0) {
    throw new Error("No valid judoka data available to select.");
  }

  const index = Math.floor(seededRandom() * validJudoka.length);
  const selectedJudoka = validJudoka[index];

  debugLog("Selected judoka:", selectedJudoka);
  return selectedJudoka;
}

/**
 * Displays a judoka card in the specified game area.
 *
 * @pseudocode
 * 1. Validate the `gameArea` element:
 *    - Ensure `gameArea` is not `null` or `undefined`.
 *    - If invalid, log an error and exit the function.
 *
 * 2. Validate the `judoka` object:
 *    - Ensure `judoka` contains all required fields.
 *    - If invalid, log an error and display a fallback message in the `gameArea`.
 *
 * 3. Clear the `gameArea`:
 *    - Set its `innerHTML` to an empty string to remove existing content.
 *
 * 4. Generate the judoka card:
 *    - Build the card using `JudokaCard` with the `judoka` and `gokyo` data.
 *    - Append the generated card element to the `gameArea`.
 *    - Log a success message for debugging.
 *
 * 5. Handle errors during card generation:
 *    - Log the error to the console.
 *    - Display a fallback error message in the `gameArea`.
 *
 * @param {Judoka} judoka - The judoka object containing data for the card.
 * @param {Object} gokyo - The gokyo data used to enrich the card.
 * @param {HTMLElement} gameArea - The DOM element where the card will be displayed.
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
export async function displayJudokaCard(judoka, gokyo, gameArea) {
  debugLog("Judoka passed to displayJudokaCard:", judoka);
  if (!gameArea) {
    console.error("Game area is not available.");
    return;
  }

  if (!hasRequiredJudokaFields(judoka)) {
    console.error("Invalid judoka object:", judoka);
    const missing = escapeHtml(getMissingJudokaFields(judoka).join(", "));
    gameArea.innerHTML = `<p>⚠️ Invalid judoka data. Missing fields: ${missing}</p>`;
    return;
  }

  try {
    gameArea.innerHTML = "";
    const cardElement = await new JudokaCard(judoka, gokyo).render();
    gameArea.appendChild(cardElement);
    setupLazyPortraits(cardElement);
    debugLog("Judoka card successfully displayed:", cardElement);
  } catch (error) {
    console.error("Error generating judoka card:", error);
    gameArea.innerHTML = "<p>⚠️ Failed to generate judoka card. Please try again later.</p>";
  }
}

/**
 * Toggles inspector panels for judoka cards.
 *
 * @pseudocode
 * 1. For each `.card-container` on the page:
 *    - Locate an existing `.debug-panel` within the container.
 * 2. When `enable` is true and no panel exists:
 *    - Read the `data-card-json` attribute and `.judoka-card` element.
 *    - If either is missing, skip this container.
 *    - Attempt to parse the JSON safely.
 *      - On parse failure, log a warning and skip panel creation.
 *    - Create and append the inspector panel using the parsed data.
 * 3. When `enable` is false and a panel exists:
 *    - Remove the panel and clear the `data-inspector` attribute.
 *
 * @param {boolean} enable - Whether to show inspector panels.
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
export function toggleInspectorPanels(enable) {
  document.querySelectorAll(".card-container").forEach((container) => {
    const existing = container.querySelector(".debug-panel");
    if (enable) {
      if (!existing) {
        const json = container.dataset.cardJson;
        const card = container.querySelector(".judoka-card");
        if (!json || !card) return;
        let data;
        try {
          data = JSON.parse(json);
        } catch (error) {
          console.warn("Invalid card JSON:", error);
          return;
        }
        const panel = createInspectorPanel(container, data);
        container.appendChild(panel);
      }
    } else if (existing) {
      existing.remove();
      container.removeAttribute("data-inspector");
    }
  });
}
