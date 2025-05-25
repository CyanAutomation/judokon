import { generateJudokaCardHTML } from "./cardBuilder.js";

/**
 * Selects a random judoka from the provided data array.
 *
 * Pseudocode:
 * 1. Validate the input data:
 *    - Check if `data` is an array and is not empty.
 *    - If `data` is invalid, throw an error with a descriptive message.
 *
 * 2. Generate a random index:
 *    - Use `Math.random()` to generate a random number between 0 and 1.
 *    - Multiply the random number by the length of the `data` array.
 *    - Use `Math.floor()` to round down to the nearest whole number.
 *
 * 3. Log the random index to the console for debugging purposes.
 *
 * 4. Return the judoka object at the randomly selected index.
 *
 * @param {Judoka[]} data - An array of judoka objects.
 * @returns {Judoka} A randomly selected judoka object.
 * @throws {Error} If the `data` array is invalid or empty.
 */
export function getRandomJudoka(data) {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("No judoka data available to select.");
  }

  // Filter out invalid entries
  const validJudoka = data.filter(
    (judoka) =>
      judoka.firstname && judoka.surname && judoka.country && judoka.stats && judoka.signatureMoveId
  );

  if (validJudoka.length === 0) {
    throw new Error("No valid judoka data available to select.");
  }

  const index = Math.floor(Math.random() * validJudoka.length);
  const selectedJudoka = validJudoka[index];

  console.log("Selected judoka:", selectedJudoka);
  return selectedJudoka;
}

/**
 * Displays a judoka card in the specified game area.
 *
 * Pseudocode:
 * 1. Log the `judoka` object to the console for debugging purposes.
 * 2. Check if the `gameArea` element is available:
 *    - If `gameArea` is `null` or `undefined`, log an error and exit the function.
 *
 * 3. Clear the `gameArea`:
 *    - Set its `innerHTML` to an empty string to remove any existing content.
 *
 * 4. Generate the judoka card:
 *    - Call `generateJudokaCardHTML` with the `judoka` and `gokyo` data to create the card element.
 *    - Append the generated card element to the `gameArea`.
 *    - Log a success message to the console.
 *
 * 5. Handle errors:
 *    - If an error occurs during card generation, log the error to the console.
 *    - Display a fallback error message in the `gameArea`.
 *
 *
 * @param {Judoka} judoka - The judoka object containing data for the card.
 * @param {Object} gokyo - The gokyo data used to enrich the card.
 * @param {HTMLElement} gameArea - The DOM element where the card will be displayed.
 * @param {HTMLElement} showRandom - The "random" button element to be displayed.
 */
export async function displayJudokaCard(judoka, gokyo, gameArea) {
  console.log("Judoka passed to displayJudokaCard:", judoka);

  if (
    !judoka ||
    !judoka.firstname ||
    !judoka.surname ||
    !judoka.country ||
    !judoka.stats ||
    !judoka.signatureMoveId
  ) {
    console.error("Invalid judoka object:", judoka);
    gameArea.innerHTML = "<p>⚠️ Invalid judoka data. Unable to display card.</p>";
    return;
  }

  if (!gameArea) {
    console.error("Game area is not available.");
    return;
  }

  try {
    gameArea.innerHTML = "";
    const cardElement = await generateJudokaCardHTML(judoka, gokyo);
    gameArea.appendChild(cardElement);
    console.log("Judoka card successfully displayed:", cardElement);
  } catch (error) {
    console.error("Error generating judoka card:", error);
    gameArea.innerHTML = "<p>⚠️ Failed to generate judoka card. Please try again later.</p>";
  }
}
