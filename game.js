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

  function displayJudokaCard(judoka, gokyo) {
    console.log("Judoka passed to displayJudokaCard:", judoka);
    if (!gameArea) {
      console.error("Game area is not available.");
      return;
    }
    gameArea.innerHTML = generateJudokaCardHTML(judoka, gokyo);
  }
});