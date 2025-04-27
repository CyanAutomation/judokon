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
    showScreen('loading'); // <-- instead of toggleLoading(true)
  
    try {
      const judokaData = await fetch("/judokon/data/judoka.json").then((response) => response.json());
      const gokyoData = await fetch("/judokon/data/gokyo.json").then((response) => response.json());
  
      console.log("Judoka data fetched:", judokaData);
      console.log("Gokyo data fetched:", gokyoData);
  
      const selectedJudoka = getRandomJudoka(judokaData);
      console.log("Selected judoka:", selectedJudoka);
  
      displayJudokaCard(selectedJudoka, gokyoData);
  
      showScreen('battle'); // <-- instead of toggleLoading(false)
    } catch (error) {
      console.error("Error loading card:", error);
      screens.battle.innerHTML = `<p>⚠️ Failed to load card. Please try again later.</p>`;
      showScreen('battle');
    }
  });

  const screens = {
    home: document.getElementById('homeScreen'),
    loading: document.getElementById('loadingScreen'),
    battle: document.getElementById('battleScreen'),
    browse: document.getElementById('browseScreen'),
    edit: document.getElementById('editScreen'),
  };

  function toggleLoading(isLoading) {
    if (isLoading) {
      showScreen('loading');
    } else {
      showScreen('battle'); // or whatever screen should appear after loading
    }
  }

  function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
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