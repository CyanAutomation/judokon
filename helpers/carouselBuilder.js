import { generateJudokaCardHTML } from "./helpers/cardBuilder.js";

/**
 * Builds a carousel of judoka cards and returns it as a DOM element.
 *
 * @param {Array} judokaList - An array of judoka objects to render in the carousel.
 * @returns {Promise<HTMLElement>} A promise that resolves to the carousel container DOM element.
 */
export async function buildCardCarousel(judokaList, gokyoData) {
  // Create a new container for the carousel
  const container = document.createElement("div");
  container.className = "card-carousel";

  // Loop through each judoka and generate their card
  for (const judoka of judokaList) {
    try {
      // Find the gokyo data for the judoka's signature move
      const gokyo = gokyoData.find((move) => move.code === judoka.signatureMove) || {};

      // Generate the judoka card
      const card = await generateJudokaCardHTML(judoka, gokyo);

      // Add the card to the carousel container
      container.appendChild(card);
    } catch (error) {
      console.error(
        `Error generating card for judoka: ${judoka.firstname} ${judoka.surname}`,
        error
      );
    }
  }

  // Return the completed carousel container
  return container;
}