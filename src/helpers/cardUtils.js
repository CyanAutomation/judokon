import { createInspectorPanel } from "./inspector/createInspectorPanel.js";
import { debugLog } from "./debug.js";
import { seededRandom } from "./testModeUtils.js";
import { getMissingJudokaFields, hasRequiredJudokaFields } from "./judokaValidation.js";
import { setupLazyPortraits } from "./lazyPortrait.js";
import { JudokaCard } from "../components/JudokaCard.js";

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
 * 1. Validate the `judoka` object:
 *    - Ensure `judoka` contains all required fields.
 *    - If invalid, log an error and display a fallback message in the `gameArea`.
 *
 * 2. Validate the `gameArea` element:
 *    - Ensure `gameArea` is not `null` or `undefined`.
 *    - If invalid, log an error and exit the function.
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
export async function displayJudokaCard(judoka, gokyo, gameArea) {
  debugLog("Judoka passed to displayJudokaCard:", judoka);

  if (!hasRequiredJudokaFields(judoka)) {
    console.error("Invalid judoka object:", judoka);
    const missing = getMissingJudokaFields(judoka).join(", ");
    gameArea.innerHTML = `<p>⚠️ Invalid judoka data. Missing fields: ${missing}</p>`;
    return;
  }

  if (!gameArea) {
    console.error("Game area is not available.");
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

export function toggleInspectorPanels(enable) {
  document.querySelectorAll(".card-container").forEach((container) => {
    const existing = container.querySelector(".debug-panel");
    if (enable) {
      if (!existing) {
        const json = container.dataset.cardJson;
        const card = container.querySelector(".judoka-card");
        if (!json || !card) return;
        const panel = createInspectorPanel(container, JSON.parse(json));
        container.appendChild(panel);
      }
    } else if (existing) {
      existing.remove();
      container.removeAttribute("data-inspector");
    }
  });
}
