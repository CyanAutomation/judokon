import { generateJudokaCardHTML } from "./cardBuilder.js";

export function getRandomJudoka(data) {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("No judoka data available to select.");
  }
  const index = Math.floor(Math.random() * data.length);
  console.log("Random index:", index);
  return data[index];
}

export async function displayJudokaCard(judoka, gokyo, gameArea, showRandom) {
  console.log("Judoka passed to displayJudokaCard:", judoka);
  if (!gameArea) {
    console.error("Game area is not available.");
    return;
  }

  try {
    gameArea.innerHTML = "";

    const cardElement = await generateJudokaCardHTML(judoka, gokyo);
    gameArea.appendChild(cardElement);

    console.log("Judoka card successfully displayed:", cardElement);

    showRandom.classList.remove("hidden");
    gameArea.appendChild(showRandom);
  } catch (error) {
    console.error("Error generating judoka card:", error);
    gameArea.innerHTML = "<p>⚠️ Failed to generate judoka card. Please try again later.</p>";
  }
}
