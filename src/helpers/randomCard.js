import { fetchJson } from "./dataUtils.js";
import { createGokyoLookup } from "./utils.js";
import { generateJudokaCardHTML } from "./cardBuilder.js";
import { getRandomJudoka } from "./cardUtils.js";
import { DATA_DIR } from "./constants.js";

/**
 * Generates a random judoka card and appends it to a container element.
 *
 * @pseudocode
 * 1. Ensure judoka data is available:
 *    - If `activeCards` is undefined, fetch `judoka.json` and filter out hidden
 *      or incomplete entries.
 * 2. Ensure gokyo data is available:
 *    - Use the provided `gokyoData` or fetch `gokyo.json`.
 *    - Create a lookup object with `createGokyoLookup`.
 * 3. Select a random judoka using `getRandomJudoka`.
 * 4. Generate the card HTML with `generateJudokaCardHTML` and append it to
 *    `containerEl`.
 *    - Clear existing content before appending.
 *    - Apply an animation when `prefersReducedMotion` is false.
 * 5. On any error, log the issue and display a fallback card (judoka id `0`).
 *
 * @param {Judoka[]} [activeCards] - Preloaded judoka data.
 * @param {GokyoEntry[]} [gokyoData] - Preloaded gokyo data.
 * @param {HTMLElement} containerEl - Element to contain the card.
 * @param {boolean} [prefersReducedMotion=false] - Motion preference flag.
 * @returns {Promise<void>} Resolves when the card is appended.
 */
export async function generateRandomCard(
  activeCards,
  gokyoData,
  containerEl,
  prefersReducedMotion = false
) {
  if (!containerEl) return;

  try {
    const judokaData = activeCards || (await fetchJson(`${DATA_DIR}judoka.json`));

    const validJudoka = Array.isArray(judokaData)
      ? judokaData.filter((j) => {
          const hasRequired =
            j.firstname &&
            j.surname &&
            j.countryCode &&
            j.stats &&
            j.weightClass &&
            j.signatureMoveId !== undefined &&
            j.rarity;
          return !j.isHidden && hasRequired;
        })
      : [];

    if (validJudoka.length === 0) {
      throw new Error("No valid judoka entries found");
    }

    const gokyo = gokyoData || (await fetchJson(`${DATA_DIR}gokyo.json`));
    const gokyoLookup = createGokyoLookup(gokyo);

    const selectedJudoka = getRandomJudoka(validJudoka);
    const judokaCard = await generateJudokaCardHTML(selectedJudoka, gokyoLookup);

    if (judokaCard) {
      containerEl.innerHTML = "";
      containerEl.appendChild(judokaCard);

      if (!prefersReducedMotion) {
        requestAnimationFrame(() => {
          judokaCard.classList.add("animate-card");
        });
      }
    }
    // else: do not update DOM if card is null/undefined
  } catch (error) {
    console.error("Error generating random card:", error);

    const fallbackJudoka = {
      id: 0,
      firstname: "Unknown",
      surname: "Judoka",
      country: "Unknown",
      countryCode: "N/A",
      stats: {
        power: 0,
        speed: 0,
        technique: 0,
        kumikata: 0,
        newaza: 0
      },
      weightClass: "N/A",
      signatureMoveId: 0,
      rarity: "common"
    };

    try {
      const gokyo = gokyoData || (await fetchJson(`${DATA_DIR}gokyo.json`));
      const gokyoLookup = createGokyoLookup(gokyo);
      const fallbackCard = await generateJudokaCardHTML(fallbackJudoka, gokyoLookup);

      // Only update DOM if fallbackCard is truthy
      if (fallbackCard) {
        containerEl.innerHTML = "";
        containerEl.appendChild(fallbackCard);
      }
    } catch (fallbackError) {
      console.error("Error displaying fallback card:", fallbackError);
      // Do not update DOM if fallback also fails
    }
  }
}
