import { STATS, getScores } from "../battleEngine.js";

function getStatValue(container, stat) {
  const index = STATS.indexOf(stat) + 1;
  const span = container.querySelector(`li.stat:nth-child(${index}) span`);
  return span ? parseInt(span.textContent, 10) : 0;
}

export function updateScoreDisplay() {
  const { playerScore, computerScore } = getScores();
  const el = document.getElementById("score-display");
  if (el) {
    el.innerHTML = `You: ${playerScore}<br>\nComputer: ${computerScore}`;
  }
}

export { getStatValue };
