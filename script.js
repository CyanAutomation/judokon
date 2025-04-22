import { getFlagUrl, generateJudokaCardHTML } from './utils.js';

document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startBtn");
  const gameArea = document.getElementById("gameArea");
  const loadingIndicator = document.getElementById("loading");

  startBtn.addEventListener("click", async () => {
    console.log("Start button clicked!");
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

  function displayJudokaCard(judoka) {
    gameArea.innerHTML = `
      <div>
        <h2>${judoka.firstName} ${judoka.surname}</h2>
        <p>Country: ${judoka.country}</p>
      </div>
    `;
  }
});