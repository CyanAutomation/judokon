// Import utility functions for generating flag URLs and judoka card HTML
import { getFlagUrl, generateJudokaCardHTML } from './utils.js';

// Wait for the DOM to fully load before executing the script
document.addEventListener("DOMContentLoaded", () => {
  // Select DOM elements for the start button, game area, and loading indicator
  const startBtn = document.getElementById("startBtn");
  const gameArea = document.getElementById("gameArea");
  const loadingIndicator = document.getElementById("loading");

  // Add a click event listener to the "Start Game" button
  startBtn.addEventListener("click", async () => {
    // Log the button click for debugging
    console.log("Start button clicked!");
    // Hide the start button and show the loading indicator
    startBtn.classList.add("hidden");
    gameArea.innerHTML = ""; // Clear the game area
    loadingIndicator.classList.remove("hidden");

    // Simulate a delay (e.g., loading game assets)
    setTimeout(() => {
    // Hide the loading spinner and show the game area
    loadingDiv.classList.add("hidden");
    gameArea.classList.remove("hidden");
    }, 2000); // 2-second delay

    try {
      // Fetch the judoka data from the JSON file
      const response = await fetch("data/judoka.json");
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const judokaData = await response.json();

      console.log("Judoka data fetched:", judokaData); // Debugging log

      // Select a random judoka from the data
      const randomJudoka = getRandomJudoka(judokaData);
      console.log("Selected judoka:", selectedJudoka); // Debugging log
      displayJudokaCard(randomJudoka);
    } catch (error) {
      console.error("Error loading card:", error);
      gameArea.innerHTML = `<p>⚠️ Failed to load card. Please try again later.</p>`;
    } finally {
      // Hide the loading indicator and show the game area
      loadingIndicator.classList.add("hidden");
    }
  });

  function getRandomJudoka(data) {
    const index = Math.floor(Math.random() * data.length);
    return data[index];
    console.log("Random index:", randomIndex); // Debugging log
  }

  // Function to display the selected judoka's card
  function displayJudokaCard(judoka) {
    // Use the utility function to generate the judoka card HTML
    gameArea.innerHTML = generateJudokaCardHTML(judoka);
  }
});