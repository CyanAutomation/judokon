import { generateRandomCard } from "./randomCard.js";
import { getRandomJudoka, renderJudokaCard } from "./cardUtils.js";
import { fetchJson } from "./dataUtils.js";
import { createGokyoLookup } from "./utils.js";
import { DATA_DIR } from "./constants.js";
import {
  startRound as engineStartRound,
  handleStatSelection as engineHandleStatSelection,
  quitMatch as engineQuitMatch,
  getScores,
  isMatchEnded,
  STATS,
  _resetForTest as engineReset
} from "./battleEngine.js";
import { updateScore, startCountdown } from "./setupBattleInfoBar.js";

let judokaData = null;
let gokyoLookup = null;

function getStatValue(container, stat) {
  const index = STATS.indexOf(stat) + 1;
  const span = container.querySelector(`li.stat:nth-child(${index}) span`);
  return span ? parseInt(span.textContent, 10) : 0;
}

function updateScoreDisplay() {
  const { playerScore, computerScore } = getScores();
  updateScore(playerScore, computerScore);
  const el = document.getElementById("score-display");
  if (el) {
    el.textContent = `You: ${playerScore} Computer: ${computerScore}`;
  }
}

function showResult(message) {
  const el = document.getElementById("round-message");
  if (!el) return;
  el.classList.add("fade-transition");
  el.textContent = message;
  el.classList.remove("fading");
  if (message) {
    setTimeout(() => {
      el.classList.add("fading");
    }, 2000);
  }
}

function startTimer() {
  const timerEl = document.getElementById("next-round-timer");
  engineStartRound(
    (remaining) => {
      if (timerEl) timerEl.textContent = String(remaining);
    },
    () => {
      const randomStat = STATS[Math.floor(Math.random() * STATS.length)];
      handleStatSelection(randomStat);
    }
  );
}

/**
 * Start a new battle round by drawing cards for both players.
 *
 * @pseudocode
 * 1. Load judoka and gokyo data if not already cached.
 * 2. Draw a random card for the player using `generateRandomCard` and capture
 *    the selected judoka.
 * 3. Select a random judoka for the computer.
 *    - If it matches the player's judoka, retry up to a safe limit.
 *    - Display the chosen judoka with `renderJudokaCard`.
 * 4. Initialize the round timer.
 *
 * @returns {Promise<void>} Resolves when cards are displayed.
 */
export async function startRound() {
  if (!judokaData) {
    judokaData = await fetchJson(`${DATA_DIR}judoka.json`);
  }
  if (!gokyoLookup) {
    const gokyoData = await fetchJson(`${DATA_DIR}gokyo.json`);
    gokyoLookup = createGokyoLookup(gokyoData);
  }
  const playerContainer = document.getElementById("player-card");
  const computerContainer = document.getElementById("computer-card");
  let playerJudoka = null;
  await generateRandomCard(judokaData, null, playerContainer, false, (j) => {
    playerJudoka = j;
  });
  let compJudoka = getRandomJudoka(judokaData);
  if (playerJudoka) {
    // avoid showing the same judoka, but guard against infinite loops
    let attempts = 0;
    const maxAttempts = Math.max(judokaData?.length || 0, 5);
    while (compJudoka.id === playerJudoka.id && attempts < maxAttempts) {
      compJudoka = getRandomJudoka(judokaData);
      attempts += 1;
    }
  }
  await renderJudokaCard(compJudoka, gokyoLookup, computerContainer, {
    animate: false
  });
  showResult("");
  updateScoreDisplay();
  startTimer();
}

/**
 * Compare the chosen stat and update scores.
 *
 * @pseudocode
 * 1. Stop the round timer to prevent duplicate selections.
 * 2. Read the selected stat value from both cards.
 * 3. Compare the values and update scores accordingly.
 *    - When values are equal, show "Tie – no score" and skip score changes.
 * 4. Increment the round counter and update the score display.
 * 5. Check if the match should end:
 *    - End when either player reaches `CLASSIC_BATTLE_POINTS_TO_WIN`.
 *    - End after `CLASSIC_BATTLE_MAX_ROUNDS` rounds.
 * 6. Display the result message.
 * 7. Begin the next round after a short delay if the match continues.
 *
 * @param {string} stat - The stat name to compare.
 */
export function handleStatSelection(stat) {
  const playerContainer = document.getElementById("player-card");
  const computerContainer = document.getElementById("computer-card");
  const playerVal = getStatValue(playerContainer, stat);
  const compVal = getStatValue(computerContainer, stat);
  const result = engineHandleStatSelection(playerVal, compVal);
  if (result.message) {
    showResult(result.message);
  }
  updateScoreDisplay();
  if (!result.matchEnded) {
    const attemptStart = async () => {
      try {
        await startRound();
      } catch {
        showResult("Waiting...");
        setTimeout(attemptStart, 1000);
      }
    };
    startCountdown(3, () => {
      if (!isMatchEnded()) {
        attemptStart();
      }
    });
  }
}

/**
 * End the current match after user confirmation.
 *
 * @pseudocode
 * 1. Display a confirmation dialog.
 * 2. When confirmed, stop the timer and mark the match as ended.
 * 3. Show a loss message in the result area.
 */
export function quitMatch() {
  if (confirm("Quit the match?")) {
    const result = engineQuitMatch();
    showResult(result.message);
  }
}

export function _resetForTest() {
  judokaData = null;
  gokyoLookup = null;
  engineReset();
  const timerEl = document.getElementById("next-round-timer");
  if (timerEl) timerEl.textContent = "";
  const resultEl = document.getElementById("round-message");
  if (resultEl) resultEl.textContent = "";
  updateScoreDisplay();
}
