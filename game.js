import { generateJudokaCardHTML } from "./helpers/cardBuilder.js";

document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startBtn");
  const gameArea = document.getElementById("gameArea");
  const loadingIndicator = document.getElementById("loading");

  if (!startBtn || !gameArea || !loadingIndicator) {
    console.error("Required DOM elements are missing.");
    return;
  }

  startBtn.addEventListener("click", async () => {
    console.log("Start button clicked!");
    startBtn.classList.add("hidden");
    gameArea.innerHTML = ""; // Clear the game area

    try {
      toggleLoading(true);

      const judokaData = await fetchDataWithErrorHandling("./data/judoka.json");
      const gokyoData = await fetchDataWithErrorHandling("./data/gokyo.json");

      validateData(judokaData, "judoka");
      validateData(gokyoData, "gokyo");

      const selectedJudoka = getRandomJudoka(judokaData);
      displayJudokaCard(selectedJudoka, gokyoData);
    } catch (error) {
      console.error("Error loading card:", error);
      gameArea.innerHTML = `<p>⚠️ Failed to load card. ${error.message}. Please try again later.</p>`;
    } finally {
      toggleLoading(false);
    }
  });

  function toggleLoading(isLoading) {
    if (isLoading) {
      loadingIndicator.classList.remove("hidden");
      gameArea.classList.add("hidden");
    } else {
      loadingIndicator.classList.add("hidden");
      gameArea.classList.remove("hidden");
    }
  }

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

  function validateData(data, type) {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error(`Invalid or empty ${type} data.`);
    }
  }

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
   *      a. Call `generateJudokaCardHTML` (asynchronous) to generate the card's HTML.
   *      b. Await the result and assign it to `cardHTML`.
   *      c. Inject the generated `cardHTML` into the `gameArea` element.
   *    - Catch:
   *      a. Log any errors that occur during card generation.
   *      b. Display an error message in the `gameArea` element.
   * 
   * @param {Object} judoka - The judoka object containing data for the card.
   * @param {Array} gokyo - The array of Gokyo entries (techniques).
   */
  async function displayJudokaCard(judoka, gokyo) {
    console.log("Judoka passed to displayJudokaCard:", judoka);
    if (!gameArea) {
      console.error("Game area is not available.");
      return;
    }
  
    try {
      const cardHTML = await generateJudokaCardHTML(judoka, gokyo);
      gameArea.innerHTML = cardHTML;
    } catch (error) {
      console.error("Error generating judoka card:", error);
      gameArea.innerHTML = "<p>⚠️ Failed to generate judoka card. Please try again later.</p>";
    }
  }
});