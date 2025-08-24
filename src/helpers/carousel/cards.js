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
 *    - Note: Do not await image load events here; the carousel wrapper is
 *      attached to the DOM after this function returns. Waiting on image
 *      loads would deadlock when elements are detached.
 *
 * @param {HTMLElement} container - Carousel container element.
 * @param {Judoka[]} judokaList - Array of judoka objects.
 * @param {Object} gokyoLookup - Lookup object for gokyo data.
 * @returns {Promise<void>} Resolves after cards are appended (not after images load).
 */
export async function appendCards(container, judokaList, gokyoLookup) {
  // Track any in-flight replacements triggered during this execution.
  const pendingReplacements = [];
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
        // Handle portrait load errors by swapping to a fallback card, but
        // do not block on image load events while building the carousel.
        img.addEventListener(
          "error",
          () => {
            // Start the replacement asynchronously and track it so that
            // appendCards can await if the error occurs before it returns.
            const task = (async () => {
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
              }
            })();
            pendingReplacements.push(task);
          },
          { once: true }
        );
      }
      card.tabIndex = 0;
      card.setAttribute("role", "listitem");
      card.setAttribute("aria-label", card.getAttribute("data-judoka-name") || "Judoka card");
      container.appendChild(card);
    }
  }
  // Give the event loop a turn so any synchronously dispatched image
  // error events can register tasks, then await them.
  await Promise.resolve();
  if (pendingReplacements.length) {
    await Promise.allSettled(pendingReplacements);
  }
  return;
}
