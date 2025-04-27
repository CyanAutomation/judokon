import { generateJudokaCardHTML } from "./helpers/cardBuilder.js";

document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startBtn");
  const browseBtn = document.getElementById("browseBtn");
  const backToHomeBtn = document.getElementById("backToHomeBtn");
  const gameArea = document.getElementById("gameArea");
  const loadingIndicator = document.getElementById("loading");

  if (!startBtn || !gameArea ) {
    console.error("Required DOM elements are missing.");
    return;
  }

  const screens = {
    home: document.getElementById('homeScreen'),
    loading: document.getElementById('loadingScreen'),
    battle: document.getElementById('battleScreen'),
  };

  function showScreen(screenName) {
    Object.values(screens).forEach(screen => {
      if (screen) {
        screen.classList.remove('active');
      }
    });
    if (screens[screenName]) {
      screens[screenName].classList.add('active');
    } else {
      console.error(`Screen '${screenName}' does not exist.`);
    }
  }

  startBtn.addEventListener("click", async () => {
    console.log("Start Game clicked!");
    showScreen('loading');

    try {
      // Simulate loading with timeout (replace with fetch later)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // After loading is done
      gameArea.innerHTML = "<p>Random Judoka Card will appear here!</p>";
      showScreen('battle');
    } catch (error) {
      console.error("Error starting game:", error);
    }
  });

  browseBtn.addEventListener("click", () => {
    alert("Browse Cards feature coming soon!");
  });

  backToHomeBtn.addEventListener("click", () => {
    showScreen('home');
  });


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