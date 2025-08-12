import { generateJudokaCard } from "../cardBuilder.js";
import { getFallbackJudoka } from "../judokaUtils.js";
import { getMissingJudokaFields, hasRequiredJudokaFields } from "../judokaValidation.js";

/**
 * Generate judoka cards and append them to the container.
 *
 * @pseudocode
 * 1. For each judoka:
 *    a. Validate required fields and log errors for missing data.
 *    b. Generate a card or fall back to a default judoka.
 *    c. Apply accessibility attributes and append to the container.
 *    d. On portrait load error, swap the image to the silhouette placeholder (no card rebuild).
 *
 * @param {HTMLElement} container - Carousel container element.
 * @param {Judoka[]} judokaList - Array of judoka objects.
 * @param {Object} gokyoLookup - Lookup object for gokyo data.
 * @returns {Promise<void>} Resolves when all cards are appended.
 */
export async function appendCards(container, judokaList, gokyoLookup) {
  for (const judoka of judokaList) {
    let entry = judoka;
    if (!hasRequiredJudokaFields(judoka)) {
      console.error("Invalid judoka object:", judoka);
      const missing = getMissingJudokaFields(judoka).join(", ");
      console.error(`Missing fields: ${missing}`);
      entry = await getFallbackJudoka();
    }
    let card = await generateJudokaCard(entry, gokyoLookup, container);
    if (!card) {
      console.warn("Failed to generate card for judoka:", entry);
      const fallback = await getFallbackJudoka();
      card = await generateJudokaCard(fallback, gokyoLookup, container);
    }
    if (card) {
      const img = card.querySelector("img");
      if (img) {
        // Be resilient: if a portrait 404s, fall back to the silhouette image
        // without reconstructing the entire card to avoid layout/DOM churn.
        img.onerror = () => {
          // Clear handler to avoid loops and set placeholder directly.
          img.onerror = null;
          img.removeAttribute("data-portrait-src");
          img.src = "../assets/judokaPortraits/judokaPortrait-0.png";
        };
      }
      card.tabIndex = 0;
      card.setAttribute("role", "listitem");
      card.setAttribute("aria-label", card.getAttribute("data-judoka-name") || "Judoka card");
      container.appendChild(card);
    }
  }
}
