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
 *    d. On portrait load error, rebuild the card using fallback judoka and replace the broken card.
 *    e. Collect a promise that resolves when the portrait either loads or is replaced.
 *
 * @param {HTMLElement} container - Carousel container element.
 * @param {Judoka[]} judokaList - Array of judoka objects.
 * @param {Object} gokyoLookup - Lookup object for gokyo data.
 * @returns {Promise<void[]>} Resolves when all portraits load or are replaced.
 */
export async function appendCards(container, judokaList, gokyoLookup) {
  const replacements = [];
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
        // Create a promise that resolves when the image either loads or is replaced
        const replacement = new Promise((resolve) => {
          const cleanup = () => resolve();
          img.addEventListener("load", cleanup, { once: true });
          // If a portrait fails to load, rebuild the card with fallback judoka
          // and replace the broken element to maintain consistent content.
          img.addEventListener(
            "error",
            async () => {
              try {
                const fallback = await getFallbackJudoka();
                // Build a replacement card without auto-appending to container.
                const fallbackCard = await generateJudokaCard(fallback, gokyoLookup);
                if (fallbackCard) {
                  const parent = container || card.parentElement;
                  if (parent && parent.contains(card)) {
                    parent.replaceChild(fallbackCard, card);
                  } else if (parent) {
                    parent.appendChild(fallbackCard);
                  }
                }
              } catch (err) {
                console.error("Failed to swap to fallback card", err);
              } finally {
                cleanup();
              }
            },
            { once: true }
          );
        });
        replacements.push(replacement);
      }
      card.tabIndex = 0;
      card.setAttribute("role", "listitem");
      card.setAttribute("aria-label", card.getAttribute("data-judoka-name") || "Judoka card");
      container.appendChild(card);
    }
  }
  return Promise.all(replacements);
}
