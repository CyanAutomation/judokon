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

  if (!gokyoData || gokyoData.length === 0) {
    console.error("gokyoData is empty or undefined");
  }

  // Transform gokyoData into a lookup object for quick access
  const gokyoLookup = gokyoData.reduce((acc, move) => {
    acc[move.id] = move; // Use string keys for consistency
    return acc;
  }, {});

  // Loop through each judoka and generate their card
  for (const judoka of judokaList) {
    try {
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

  // Create a wrapper for the carousel and buttons
  const wrapper = document.createElement("div");
  wrapper.className = "carousel-wrapper";

  // Create left scroll button
  const leftButton = document.createElement("button");
  leftButton.className = "scroll-button left";
  leftButton.innerHTML = "&lt;"; // Left arrow
  leftButton.setAttribute("aria-label", "Scroll Left");

  // Create right scroll button
  const rightButton = document.createElement("button");
  rightButton.className = "scroll-button right";
  rightButton.innerHTML = "&gt;"; // Right arrow
  rightButton.setAttribute("aria-label", "Scroll Right");

  // Add scroll functionality to buttons
  leftButton.addEventListener("click", () => {
    container.scrollBy({
      left: -300, // Adjust scroll distance as needed
      behavior: "smooth"
    });
  });

  rightButton.addEventListener("click", () => {
    container.scrollBy({
      left: 300, // Adjust scroll distance as needed
      behavior: "smooth"
    });
  });

  // Append buttons and carousel to the wrapper
  wrapper.appendChild(leftButton);
  wrapper.appendChild(container);
  wrapper.appendChild(rightButton);

  // Return the completed wrapper
  return wrapper;
}
