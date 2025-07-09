import { generateRandomCard } from "./randomCard.js";
import { getRandomJudoka, displayJudokaCard } from "./cardUtils.js";
import { fetchJson } from "./dataUtils.js";
import { createGokyoLookup } from "./utils.js";
import { DATA_DIR, CLASSIC_BATTLE_POINTS_TO_WIN, CLASSIC_BATTLE_MAX_ROUNDS } from "./constants.js";

const STATS = ["power", "speed", "technique", "kumikata", "newaza"];
let judokaData = null;
let gokyoLookup = null;
let playerScore = 0;
let computerScore = 0;
let timerId = null;
let remaining = 0;
let matchEnded = false;
let roundsPlayed = 0;

function getStatValue(container, stat) {
  const index = STATS.indexOf(stat) + 1;
  const span = container.querySelector(`li.stat:nth-child(${index}) span`);
  return span ? parseInt(span.textContent, 10) : 0;
}

function updateScoreDisplay() {
  const el = document.getElementById("score-display");
  if (el) {
    el.textContent = `You: ${playerScore} Computer: ${computerScore}`;
  }
}

function showResult(message) {
  const el = document.getElementById("round-result");
  if (el) {
    el.textContent = message;
  }
}

function endMatchIfNeeded() {
  if (
    playerScore >= CLASSIC_BATTLE_POINTS_TO_WIN ||
    computerScore >= CLASSIC_BATTLE_POINTS_TO_WIN ||
    roundsPlayed >= CLASSIC_BATTLE_MAX_ROUNDS
  ) {
    matchEnded = true;
    let message = "Match ends in a tie!";
    if (playerScore > computerScore) {
      message = "You win the match!";
    } else if (playerScore < computerScore) {
      message = "Computer wins the match!";
    }
    showResult(message);
    return true;
  }
  return false;
}

function startTimer() {
  const timerEl = document.getElementById("round-timer");
  remaining = 30;
  if (timerEl) timerEl.textContent = String(remaining);
  timerId = setInterval(() => {
    remaining -= 1;
    if (timerEl) timerEl.textContent = String(remaining);
    if (remaining <= 0) {
      clearInterval(timerId);
      timerId = null;
      if (!matchEnded) {
        const randomStat = STATS[Math.floor(Math.random() * STATS.length)];
        handleStatSelection(randomStat);
      }
    }
  }, 1000);
}

/**
 * Start a new battle round by drawing cards for both players.
 *
 * @pseudocode
 * 1. Load judoka and gokyo data if not already cached.
 * 2. Draw a random card for the player using `generateRandomCard`.
 * 3. Select a random judoka for the computer and display it with `displayJudokaCard`.
 * 4. Initialize the round timer.
 *
 * @returns {Promise<void>} Resolves when cards are displayed.
 */
export async function startRound() {
  matchEnded = false;
  if (!judokaData) {
    judokaData = await fetchJson(`${DATA_DIR}judoka.json`);
  }
  if (!gokyoLookup) {
    const gokyoData = await fetchJson(`${DATA_DIR}gokyo.json`);
    gokyoLookup = createGokyoLookup(gokyoData);
  }
  const playerContainer = document.getElementById("player-card");
  const computerContainer = document.getElementById("computer-card");
  await generateRandomCard(judokaData, null, playerContainer, false);
  const compJudoka = getRandomJudoka(judokaData);
  await displayJudokaCard(compJudoka, gokyoLookup, computerContainer);
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
  if (matchEnded) return;
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  const playerContainer = document.getElementById("player-card");
  const computerContainer = document.getElementById("computer-card");
  const playerVal = getStatValue(playerContainer, stat);
  const compVal = getStatValue(computerContainer, stat);
  if (playerVal > compVal) {
    playerScore += 1;
    showResult("You win the round!");
  } else if (playerVal < compVal) {
    computerScore += 1;
    showResult("Computer wins the round!");
  } else {
    showResult("Tie – no score");
  }
  roundsPlayed += 1;
  updateScoreDisplay();
  if (!endMatchIfNeeded()) {
    setTimeout(() => {
      if (!matchEnded) {
        startRound();
      }
    }, 1000);
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
    matchEnded = true;
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    showResult("You quit the match. You lose!");
  }
}

export function _resetForTest() {
  judokaData = null;
  gokyoLookup = null;
  playerScore = 0;
  computerScore = 0;
  matchEnded = false;
  roundsPlayed = 0;
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  const timerEl = document.getElementById("round-timer");
  if (timerEl) timerEl.textContent = "";
  const resultEl = document.getElementById("round-result");
  if (resultEl) resultEl.textContent = "";
  updateScoreDisplay();
}
