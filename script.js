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

    try {
      // Simulate a delay for loading (e.g., fetching data)
      // await new Promise(resolve => setTimeout(resolve, 500));

      // Fetch the judoka data from the JSON file
      const response = await fetch("data/judoka.json");
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const judokaData = await response.json();

      console.log("Judoka data fetched:", judokaData); // Debugging log

      // Select a random judoka from the data
      const randomJudoka = getRandomJudoka(judokaData);
      console.log("Selected judoka:", randomJudoka);      // Debugging log
      displayJudokaCard(randomJudoka);
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
  // This function takes a number of milliseconds and returns a promise that resolves after that time
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Function to select a random judoka from the data
  // This function takes an array of judoka data and returns a random judoka object  
  function getRandomJudoka(data) {
    const index = Math.floor(Math.random() * data.length);
    console.log("Random index:", index);
    return data[index];
  }  

  // Function to display the selected judoka's card
  function displayJudokaCard(judoka) {
    console.log("Judoka passed to displayJudokaCard:", judoka);
    // Use the utility function to generate the judoka card HTML
    gameArea.innerHTML = generateJudokaCardHTML(judoka);
    console.log("Generated card HTML:", generateJudokaCardHTML(judoka));
  }
});