import { generateJudokaCardHTML } from "./cardBuilder.js";

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

  // Transform gokyoData into a lookup object for quick access
  const gokyoLookup = gokyoData.reduce((acc, move) => {
    acc[move.id] = move.name; // Map the id to the technique name
    return acc;
  }, {});

  // Loop through each judoka and generate their card
  for (const judoka of judokaList) {
    try {
      // Retrieve the technique name using the judoka's signatureMoveId
      const techniqueName = gokyoLookup[judoka.signatureMoveId] || "Unknown Technique";

      // Pass the technique name to generateJudokaCardHTML
      const card = await generateJudokaCardHTML(judoka, techniqueName);

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
