import { getFlagUrl, generateJudokaCardHTML } from './utils.js';

// DOM Elements
const startBtn = document.getElementById("startBtn");
const gameArea = document.getElementById("gameArea");
const loadingIndicator = document.getElementById("loading");

// Display a judoka card
function displayJudokaCard(judoka) {
  gameArea.innerHTML = generateJudokaCardHTML(judoka);
}

// Fetch and display a random judoka card
startBtn.addEventListener("click", async () => {
  startBtn.classList.add("hidden");
  loadingIndicator.classList.remove("hidden");

  try {
    const response = await fetch("data/judoka.json");
    const judokaData = await response.json();
    const randomIndex = Math.floor(Math.random() * judokaData.length);
    displayJudokaCard(judokaData[randomIndex]);
  } catch (error) {
    console.error("Error loading judoka data:", error);
    gameArea.innerHTML = `<p>Failed to load game data. Please try again later.</p>`;
  } finally {
    loadingIndicator.classList.add("hidden");
  }
});