import { generateRandomCard } from "../randomCard.js";
import { getRandomJudoka, renderJudokaCard } from "../cardUtils.js";
import { fetchJson } from "../dataUtils.js";
import { createGokyoLookup } from "../utils.js";
import { DATA_DIR } from "../constants.js";

let judokaData = null;
let gokyoLookup = null;
let computerJudoka = null;

/**
 * Draw battle cards for the player and computer.
 *
 * @pseudocode
 * 1. Load judoka and gokyo data when not cached.
 * 2. Filter out judoka marked `isHidden`.
 * 3. Render a random player card using `generateRandomCard` and store the result.
 * 4. Choose a random opponent judoka avoiding duplicates.
 * 5. Render a placeholder card for the computer with obscured stats.
 * 6. Return the selected judoka objects.
 *
 * @returns {Promise<{playerJudoka: object|null, computerJudoka: object|null}>}
 */
export async function drawCards() {
  if (!judokaData) {
    judokaData = await fetchJson(`${DATA_DIR}judoka.json`);
  }
  const available = Array.isArray(judokaData) ? judokaData.filter((j) => !j.isHidden) : [];

  if (!gokyoLookup) {
    const gokyoData = await fetchJson(`${DATA_DIR}gokyo.json`);
    gokyoLookup = createGokyoLookup(gokyoData);
  }

  const playerContainer = document.getElementById("player-card");
  const computerContainer = document.getElementById("computer-card");

  let playerJudoka = null;
  await generateRandomCard(
    available,
    null,
    playerContainer,
    false,
    (j) => {
      playerJudoka = j;
    },
    { enableInspector: false }
  );

  let compJudoka = getRandomJudoka(available);
  if (playerJudoka) {
    let attempts = 0;
    const maxAttempts = Math.max(available.length || 0, 5);
    while (compJudoka.id === playerJudoka.id && attempts < maxAttempts) {
      compJudoka = getRandomJudoka(available);
      attempts += 1;
    }
  }
  computerJudoka = compJudoka;

  const placeholder = judokaData.find((j) => j.id === 1) || compJudoka;
  await renderJudokaCard(placeholder, gokyoLookup, computerContainer, {
    animate: false,
    useObscuredStats: true,
    enableInspector: false
  });

  return { playerJudoka, computerJudoka };
}

export function getComputerJudoka() {
  return computerJudoka;
}

export function clearComputerJudoka() {
  computerJudoka = null;
}

export function getGokyoLookup() {
  return gokyoLookup;
}

export function _resetForTest() {
  judokaData = null;
  gokyoLookup = null;
  computerJudoka = null;
}
