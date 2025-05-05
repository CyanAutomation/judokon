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
  // Create a new container for the carousel
  const container = document.createElement("div");
  container.className = "card-carousel";

  // Loop through each judoka and generate their card
  for (const judoka of judokaList) {
    try {
      const signatureMoveId = Number(judoka?.signatureMoveId ?? 0); // Ensure signatureMoveId is a number

      // Check if gokyo is valid
      if (!gokyo || typeof gokyo !== "object") {
        gokyo = { 0: { id: 0, name: "Jigoku-guruma" } }; // Fallback to default gokyo with ID=0
      }
    
      // Retrieve the technique from gokyo using the signatureMoveId as the key, fallback to ID=0
      const technique = gokyo[signatureMoveId] || gokyo[0];
    
      // Extract the technique name or fallback to "Unknown"
      const techniqueName = technique?.name || "Jigoku-guruma";

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
