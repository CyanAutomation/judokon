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
    console.log("Start button clicked!");
    startBtn.classList.add("hidden");
    loadingIndicator.classList.remove("hidden");

    try {
      // Fetch the judoka data from the JSON file
      const response = await fetch("data/judoka.json");
      const judokaData = await response.json();

      // Select a random judoka from the data    
      const randomIndex = Math.floor(Math.random() * judokaData.length);

      // Display the selected judoka's card in the game area
      displayJudokaCard(judokaData[randomIndex]);
    } catch (error) {
      // Handle errors during data fetching
      console.error("Error loading judoka data:", error);
      gameArea.innerHTML = `<p>Failed to load game data. Please try again later.</p>`;
    } finally {
      // Hide the loading indicator and show the game area
      loadingIndicator.classList.add("hidden");
    }
  });

  // Function to display the selected judoka's card
  function displayJudokaCard(judoka) {
    // Generate the HTML for the judoka card using the utility function
    gameArea.innerHTML = `
      <div>
        <h2>${judoka.firstName} ${judoka.surname}</h2>
        <p>Country: ${judoka.country}</p>
      </div>
    `;
  }
});