import { generateJudokaCardHTML } from "./helpers/cardBuilder.js";

/**
 * Renders a carousel of judoka cards at the bottom of the screen.
 *
 * Pseudocode:
 * 1. Get the carousel container element by its ID (`carousel`).
 *
 * 2. Wrap the rendering logic in a `try-catch` block:
 *    - Try:
 *      a. Fetch the judoka data from the `judoka.json` file.
 *      b. Parse the response as JSON to get an array of judoka objects.
 *
 *      c. Loop through each judoka object:
 *         i. Create an empty `gokyoData` object (or fetch gokyo data if needed).
 *         ii. Call `generateJudokaCardHTML` to generate a card DOM element for the judoka.
 *         iii. Add a "small" class to the card container to style it for the carousel.
 *         iv. Append the generated card element to the carousel container.
 *
 *      d. Log a success message to the console once all cards are rendered.
 *
 *    - Catch:
 *      a. Log any errors that occur during the fetch or rendering process to the console.
 *
 * @returns {Promise<void>} A promise that resolves when the carousel is rendered.
 */
export async function renderCarousel() {
  const carousel = document.getElementById("carousel");

  try {
    // Fetch all judoka data
    const judokaData = await fetch("./data/judoka.json").then((res) => res.json());

    // Loop through each judoka and render a smaller card
    for (const judoka of judokaData) {
      const gokyoData = {}; // Pass an empty object or fetch gokyo data if needed
      const cardElement = await generateJudokaCardHTML(judoka, gokyoData);

      // cardElement.classList.add("small");

      // Append the card to the carousel
      carousel.appendChild(cardElement);
    }

    console.log("Carousel rendered successfully.");
  } catch (error) {
    console.error("Error rendering carousel:", error);
  }
}
