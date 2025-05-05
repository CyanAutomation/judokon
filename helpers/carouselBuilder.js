import { generateJudokaCardHTML } from "./cardBuilder.js";

/**
 * Function: buildCardCarousel
 * Purpose:
 * - This function generates a carousel of judoka cards using a list of judoka objects and gokyo data.
 * - It returns a DOM element containing the carousel, which can be appended to the page.
 *
 * Inputs:
 * - `judokaList`: An array of judoka objects, each representing a judoka with attributes like `signatureMoveId`.
 * - `gokyoData`: An array of gokyo objects, each containing information about judo techniques (e.g., `id` and `name`).
 *
 * Process:
 * 1. Create a container element for the carousel and assign it a CSS class for styling.
 * 2. Transform the `gokyoData` array into a lookup object (`gokyoLookup`) for quick access to technique names by their IDs.
 * 3. Loop through the `judokaList`:
 *    - For each judoka, retrieve the corresponding technique name from the `gokyoLookup` using the `signatureMoveId`.
 *    - If no matching technique is found, default to "Unknown Technique".
 *    - Generate a card for the judoka using the `generateJudokaCardHTML` function, passing the judoka and the technique name.
 *    - Append the generated card to the carousel container.
 * 4. Handle any errors that occur during card generation and log them to the console.
 * 5. Return the completed carousel container as a DOM element.
 *
 * Output:
 * - A DOM element (`<div>`) containing the carousel of judoka cards.
 *
 *
 * @param {Array} judokaList - An array of judoka objects to render in the carousel.
 * @returns {Promise<HTMLElement>} A promise that resolves to the carousel container DOM element.
 */
export async function buildCardCarousel(judokaList, gokyoData) {
  console.log("buildCardCarousel function called");

  // Create a new container for the carousel
  const container = document.createElement("div");
  container.className = "card-carousel";

  // Log the raw gokyoData to verify its structure
  console.log("Raw Gokyo Data:", gokyoData);
  if (!gokyoData || gokyoData.length === 0) {
    console.error("gokyoData is empty or undefined");
  }

  // Transform gokyoData into a lookup object for quick access
  const gokyoLookup = gokyoData.reduce((acc, move) => {
    acc[move.id] = move; // Use string keys for consistency
    return acc;
  }, {});

  // Log the gokyoLookup object to verify the transformation
  console.log("Gokyo Lookup Object:", gokyoLookup);

  // Loop through each judoka and generate their card
  for (const judoka of judokaList) {
    try {
      console.log("Processing Judoka:", judoka);

      // Pass the judoka and the entire gokyoLookup to generateJudokaCardHTML
      const card = await generateJudokaCardHTML(judoka, gokyoLookup);

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