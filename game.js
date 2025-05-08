import { generateJudokaCardHTML } from "./helpers/cardBuilder.js";
import { buildCardCarousel } from "./helpers/carouselBuilder.js";

document.addEventListener("DOMContentLoaded", () => {
  const showRandom = document.getElementById("showRandom");
  const gameArea = document.getElementById("gameArea");
  const carouselContainer = document.getElementById("carousel-container");
  const showCarouselButton = document.getElementById("showCarousel");
  const hideCard = document.getElementById("hideCard");

  if (!showRandom || !gameArea) {
    console.error("Required DOM elements are missing.");
    return;
  }

  showCarouselButton.addEventListener("click", async () => {
    try {
      // Prevent rebuilding if the carousel already exists
      if (carouselContainer.hasChildNodes()) {
        carouselContainer.classList.remove("hidden");
        return;
      }

      const judokaData = await fetchDataWithErrorHandling("./data/judoka.json");
      const gokyoData = await fetchDataWithErrorHandling("./data/gokyo.json");

      validateData(judokaData, "judoka");
      validateData(gokyoData, "gokyo");

      const carousel = await buildCardCarousel(judokaData, gokyoData);
      carouselContainer.appendChild(carousel);
      carouselContainer.classList.remove("hidden");

      console.log("Carousel displayed on demand.");
    } catch (error) {
      console.error("Failed to build carousel:", error);
    }
  });

  hideCard.addEventListener("click", () => {
    // Select all judoka cards in the carousel
    const judokaCards = document.querySelectorAll(".judoka-card");
    if (judokaCards.length === 0) {
      console.error("No judoka cards found to toggle.");
      return;
    }
    // Loop through each card and toggle the "show-card-back" class
    judokaCards.forEach((card) => {
      card.classList.toggle("show-card-back");
    });
  });

  /**
   * Handles the "Start" button click event to load and display a random judoka card.
   *
   * Pseudocode:
   * 1. Log a message to the console indicating that the "Start" button was clicked.
   *
   * 2. Hide the "Start" button:
   *    - Add the "hidden" class to the `startBtn` element.
   *
   * 3. Clear the game area:
   *    - Set the `innerHTML` of the `gameArea` element to an empty string.
   *
   * 4. Wrap the data loading and card rendering process in a `try-catch-finally` block:
   *    - Try:
   *      a. Show the loading indicator by calling `toggleLoading(true)`.
   *      b. Fetch the judoka data from `./data/judoka.json` using `fetchDataWithErrorHandling`.
   *      c. Fetch the Gokyo data from `./data/gokyo.json` using `fetchDataWithErrorHandling`.
   *      d. Validate the fetched judoka and Gokyo data using `validateData`.
   *      e. Select a random judoka from the fetched data using `getRandomJudoka`.
   *      f. Display the selected judoka card by calling `displayJudokaCard` with the selected judoka and Gokyo data.
   *    - Catch:
   *      a. Log any errors that occur during the process to the console.
   *      b. Display an error message in the `gameArea` element.
   *    - Finally:
   *      a. Hide the loading indicator by calling `toggleLoading(false)`.
   *
   * @event Click - Triggered when the "Random" button is clicked.
   */

  // Update the button label to "Random"
  showRandom.textContent = "Random";

  showRandom.addEventListener("click", async () => {
    showRandom.classList.add("hidden");
    gameArea.innerHTML = ""; // Clear the game area

    try {
      const judokaData = await fetchDataWithErrorHandling("./data/judoka.json");
      const gokyoData = await fetchDataWithErrorHandling("./data/gokyo.json");

      validateData(judokaData, "judoka");
      validateData(gokyoData, "gokyo");

      const selectedJudoka = getRandomJudoka(judokaData);
      displayJudokaCard(selectedJudoka, gokyoData);
    } catch (error) {
      console.error("Error loading card:", error);
      gameArea.innerHTML = `<p>⚠️ Failed to load card. ${error.message}. Please try again later.</p>`;
    }
  });

  /**
   * Fetches JSON data from a given URL with error handling.
   *
   * Pseudocode:
   * 1. Use the `fetch` API to send a GET request to the specified `url`.
   *
   * 2. Check the response status:
   *    - If the response is not OK (`response.ok` is false), throw an error with the message:
   *      "Failed to fetch data from {url} (HTTP {response.status})".
   *
   * 3. Parse the response body as JSON:
   *    - Use `response.json()` to convert the response body into a JavaScript object.
   *
   * 4. Return the parsed JSON data.
   *
   * 5. Handle errors:
   *    - If any error occurs during the fetch or JSON parsing:
   *      a. Log the error to the console with the message:
   *         "Error fetching data from {url}: {error}".
   *      b. Rethrow the error to allow the caller to handle it.
   *
   * @param {string} url - The URL to fetch data from.
   * @returns {Promise<any>} A promise that resolves to the parsed JSON data.
   */
  async function fetchDataWithErrorHandling(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch data from ${url} (HTTP ${response.status})`);
      }
      return response.json();
    } catch (error) {
      console.error(`Error fetching data from ${url}:`, error);
      throw error;
    }
  }

  /**
   * Validates the provided data to ensure it is a valid object.
   *
   * @param {Object} data - The data to validate.
   * @param {string} type - A string describing the type of data (e.g., "judoka" or "gokyo").
   * @throws {Error} If the data is not a valid object.
   */
  function validateData(data, type) {
    if (typeof data !== "object" || data === null) {
      throw new Error(`Invalid or missing ${type} data.`);
    }
  }

  /**
   * Selects a random judoka from the provided data array.
   *
   * Pseudocode:
   * 1. Validate the input `data`:
   *    - Check if `data` is an array and has at least one element.
   *    - If `data` is not valid, throw an error with the message "No judoka data available to select."
   *
   * 2. Generate a random index:
   *    - Use `Math.random()` to generate a random number between 0 and 1.
   *    - Multiply the random number by the length of the `data` array.
   *    - Use `Math.floor()` to round down to the nearest whole number.
   *
   * 3. Log the generated random index for debugging purposes.
   *
   * 4. Return the judoka object at the random index from the `data` array.
   *
   * @param {Array} data - The array of judoka objects.
   * @returns {Object} A randomly selected judoka object.
   */
  function getRandomJudoka(data) {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("No judoka data available to select.");
    }
    const index = Math.floor(Math.random() * data.length);
    console.log("Random index:", index);
    return data[index];
  }

  /**
   * Displays a judoka card in the game area.
   *
   * Pseudocode:
   * 1. Log the `judoka` object to the console for debugging.
   *
   * 2. Check if the `gameArea` element exists:
   *    - If it does not exist, log an error and exit the function.
   *
   * 3. Wrap the card generation and rendering process in a `try-catch` block:
   *    - Try:
   *      a. Clear the `gameArea` by setting its `innerHTML` to an empty string.
   *      b. Call `generateJudokaCardHTML` (asynchronous) to generate the card's DOM element.
   *      c. Append the generated DOM element to the `gameArea` using `appendChild`.
   *      d. Log a success message to the console.
   *    - Catch:
   *      a. Log any errors that occur during card generation to the console.
   *      b. Display an error message in the `gameArea` by setting its `innerHTML`.
   *
   * @param {Object} judoka - The judoka object containing data for the card.
   * @param {Object} gokyo - The Gokyo data (technique information).
   */
  async function displayJudokaCard(judoka, gokyo) {
    console.log("Judoka passed to displayJudokaCard:", judoka);
    if (!gameArea) {
      console.error("Game area is not available.");
      return;
    }

    try {
      // Clear the game area before appending the new card
      gameArea.innerHTML = "";

      // Generate the DOM element for the judoka card
      const cardElement = await generateJudokaCardHTML(judoka, gokyo);

      // Append the DOM element to the game area
      gameArea.appendChild(cardElement);

      console.log("Judoka card successfully displayed:", cardElement);

      // Move the random button below the rendered card
      showRandom.classList.remove("hidden"); // Ensure the button is visible
      gameArea.appendChild(showRandom); // Append the button below the card
    } catch (error) {
      console.error("Error generating judoka card:", error);
      gameArea.innerHTML = "<p>⚠️ Failed to generate judoka card. Please try again later.</p>";
    }
  }
});
