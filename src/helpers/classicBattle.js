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
import * as infoBar from "./setupBattleInfoBar.js";

function getCountdown() {
  if (typeof window !== "undefined" && window.startCountdownOverride) {
    return window.startCountdownOverride;
  }
  return infoBar.startCountdown;
}

export function getStartRound() {
  if (typeof window !== "undefined" && window.startRoundOverride) {
    return window.startRoundOverride;
  }
  return startRound;
}

let judokaData = null;
let gokyoLookup = null;
let computerJudoka = null;

/**
 * Remove highlight and focus from all stat buttons.
 *
 * @pseudocode
 * 1. Select all stat buttons within `#stat-buttons`.
 * 2. For each button:
 *    a. Remove the `selected` class so the button style resets.
 *    b. Clear any inline background color to force a repaint in Safari.
 *    c. Disable the button to break the `:active` highlight.
 *    d. On the next animation frame, re-enable the button,
 *       clear `backgroundColor`, and call `blur()` so Safari
 *       drops the highlight.
 */
function resetStatButtons() {
  document.querySelectorAll("#stat-buttons button").forEach((btn) => {
    btn.classList.remove("selected");
    btn.style.removeProperty("background-color");
    btn.disabled = true;
    requestAnimationFrame(() => {
      btn.disabled = false;
      btn.style.backgroundColor = "";
      btn.blur();
    });
  });
}

function getStatValue(container, stat) {
  const index = STATS.indexOf(stat) + 1;
  const span = container.querySelector(`li.stat:nth-child(${index}) span`);
  return span ? parseInt(span.textContent, 10) : 0;
}

function updateScoreDisplay() {
  const { playerScore, computerScore } = getScores();
  infoBar.updateScore(playerScore, computerScore);
  const el = document.getElementById("score-display");
  if (el) {
    el.innerHTML = `You: ${playerScore}<br>\nComputer: ${computerScore}`;
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
      if (timerEl) timerEl.textContent = `Time Left: ${remaining}s`;
    },
    () => {
      const randomStat = STATS[Math.floor(Math.random() * STATS.length)];
      handleStatSelection(randomStat);
    }
  );
}

/**
 * Reveal the computer's hidden card.
 *
 * @pseudocode
 * 1. Exit early when no stored judoka exists.
 * 2. Render `computerJudoka` into the computer card container.
 * 3. Clear `computerJudoka` after rendering.
 *
 * @returns {Promise<void>} Resolves when the card is displayed.
 */
export async function revealComputerCard() {
  if (!computerJudoka) return;
  const container = document.getElementById("computer-card");
  await renderJudokaCard(computerJudoka, gokyoLookup, container, {
    animate: false
  });
  computerJudoka = null;
}

/**
 * Start a new battle round by drawing cards for both players.
 *
 * @pseudocode
 * 1. Clear any previously selected stat button.
 * 2. Load judoka and gokyo data if not already cached.
 * 3. Draw a random card for the player using `generateRandomCard` and capture
 *    the selected judoka.
 * 4. Select a random judoka for the computer and store it.
 *    - If it matches the player's judoka, retry up to a safe limit.
 *    - Render the mystery placeholder card (`judokaId=1`) with obscured stats.
 * 5. Initialize the round timer.
 *
 * @returns {Promise<void>} Resolves when cards are displayed.
 */
export async function startRound() {
  resetStatButtons();
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
  computerJudoka = compJudoka;
  const placeholder = judokaData.find((j) => j.id === 1) || compJudoka;
  await renderJudokaCard(placeholder, gokyoLookup, computerContainer, {
    animate: false,
    useObscuredStats: true
  });
  showResult("");
  updateScoreDisplay();
  startTimer();
}

/**
 * Evaluate the selected stat values and update the match state.
 *
 * @pseudocode
 * 1. Retrieve the stat values from both player and computer cards.
 * 2. Let the battle engine compare the values to update scores.
 * 3. Display the result message and refresh the score display.
 * 4. Return the comparison result to the caller.
 *
 * @param {string} stat - The stat name to compare.
 * @returns {{message: string, matchEnded: boolean}}
 */
export function evaluateRound(stat) {
  const playerContainer = document.getElementById("player-card");
  const computerContainer = document.getElementById("computer-card");
  const playerVal = getStatValue(playerContainer, stat);
  const compVal = getStatValue(computerContainer, stat);
  const result = engineHandleStatSelection(playerVal, compVal);
  if (result.message) {
    showResult(result.message);
  }
  updateScoreDisplay();
  return result;
}

/**
 * Begin the next round after a countdown if the match continues.
 *
 * @pseudocode
 * 1. Exit immediately when the match has ended.
 * 2. Attempt to start the next round after a short countdown.
 *    - Retry the start if the round cannot begin immediately.
 *    - Display "Waiting..." while retrying.
 * 3. Stop scheduling if the match ends during the countdown.
 *
 * @param {{matchEnded: boolean}} result - Result from evaluateRound.
 */
export function scheduleNextRound(result) {
  if (result.matchEnded) return;

  const attemptStart = async () => {
    try {
      const start = getStartRound();
      await start();
    } catch {
      showResult("Waiting...");
      setTimeout(attemptStart, 1000);
    }
  };

  const countdown = getCountdown();
  countdown(3, () => {
    if (!isMatchEnded()) {
      attemptStart();
    }
  });
}

/**
 * Compare the chosen stat and trigger the next round.
 *
 * @pseudocode
 * 1. Reveal the computer's real card.
 * 2. Evaluate the round using `evaluateRound` to update scores.
 * 3. Clear the selected state from all stat buttons.
 * 4. Call `scheduleNextRound` with the evaluation result.
 *
 * @param {string} stat - The stat name to compare.
 */
export async function handleStatSelection(stat) {
  await revealComputerCard();
  const result = evaluateRound(stat);
  resetStatButtons();
  scheduleNextRound(result);
}

/**
 * End the current match after user confirmation.
 *
 * @pseudocode
 * 1. Display a confirmation dialog.
 * 2. When confirmed, stop the timer and mark the match as ended.
 * 3. Show a loss message in the result area.
 * 4. Return `true` when the player confirms quitting, otherwise `false`.
 */
export function quitMatch() {
  if (confirm("Quit the match?")) {
    const result = engineQuitMatch();
    showResult(result.message);
    return true;
  }
  return false;
}

export function _resetForTest() {
  judokaData = null;
  gokyoLookup = null;
  computerJudoka = null;
  engineReset();
  if (typeof window !== "undefined") {
    delete window.startRoundOverride;
  }
  const timerEl = document.getElementById("next-round-timer");
  if (timerEl) timerEl.textContent = "";
  const resultEl = document.getElementById("round-message");
  if (resultEl) resultEl.textContent = "";
  updateScoreDisplay();
}

export function getComputerJudoka() {
  return computerJudoka;
}
