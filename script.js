// Import utility functions for generating flag URLs and judoka card HTML
import { generateJudokaCardHTML } from "./utils.js";

// Wait for the DOM to fully load before executing the script
document.addEventListener("DOMContentLoaded", async () => {
  // Select DOM elements for the start button, game area, and loading indicator
  const startBtn = document.getElementById("startBtn");
  // Log the start button element for debugging
  console.log("Start button element:", startBtn);
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

    try {
      // Fetch the judoka data from the JSON file
      const response = await fetch("data/judoka.json");
      console.log("Fetch response:", response);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const judokaData = await response.json();

      // Fetch the gokyo data from the JSON file
      const gokyoResponse = await fetch("data/gokyo.json");
      console.log("Gokyo fetch response:", gokyoResponse);
      if (!gokyoResponse.ok)
        throw new Error(`HTTP error! status: ${gokyoResponse.status}`);
      const gokyoData = await gokyoResponse.json();

      console.log("Judoka data fetched:", judokaData); // Debugging log
      console.log("Gokyo data fetched:", gokyoData); // Debugging log

      // Select a random judoka from the data
      const selectedJudoka = getRandomJudoka(judokaData);
      console.log("Selected judoka:", selectedJudoka); // Debugging log
      displayJudokaCard(selectedJudoka, gokyoData);
    } catch (error) {
      console.error("Error loading card:", error);
      // Display an error message in the game area
      gameArea.innerHTML = `<p>⚠️ Failed to load card. Please try again later.</p>`;
    } finally {
      // Hide the loading indicator and show the game area
      loadingIndicator.classList.add("hidden");
      gameArea.classList.remove("hidden");
    }
  });

  // Function to select a random judoka from the data
  // This function takes an array of judoka data and returns a random judoka object
  function getRandomJudoka(data) {
    const index = Math.floor(Math.random() * data.length);
    console.log("Random index:", index);
    return data[index];
  }

  // Function to display the selected judoka's card
  function displayJudokaCard(judoka, gokyo) {
    console.log("Judoka passed to displayJudokaCard:", judoka);
    // Use the utility function to generate the judoka card HTML
    gameArea.innerHTML = generateJudokaCardHTML(judoka, gokyo);
  }
});