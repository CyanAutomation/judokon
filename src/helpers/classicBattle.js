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

/**
 * Remove highlight and focus from all stat buttons.
 *
 * @pseudocode
 * 1. Select all stat buttons within `#stat-buttons`.
 * 2. For each button:
 *    a. Remove the `selected` class so the button style resets.
 *    b. Clear any inline background color to force a repaint in Safari.
 *    c. Temporarily disable the button so Safari drops the `:active` highlight.
 *    d. Read `offsetWidth` to trigger a reflow.
 *    e. Re-enable the button, set `backgroundColor` to an empty string, and
 *       call `blur()` to drop focus.
 */
function resetStatButtons() {
  document.querySelectorAll("#stat-buttons button").forEach((btn) => {
    btn.classList.remove("selected");
    btn.style.removeProperty("background-color");
    btn.disabled = true;
    // trigger reflow so Safari repaints correctly
    void btn.offsetWidth;
    btn.disabled = false;
    btn.style.backgroundColor = "";
    btn.blur();
  });
}

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
      if (timerEl) timerEl.textContent = `Time Left: ${remaining}s`;
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
 * 1. Clear any previously selected stat button.
 * 2. Load judoka and gokyo data if not already cached.
 * 3. Draw a random card for the player using `generateRandomCard` and capture
 *    the selected judoka.
 * 4. Select a random judoka for the computer.
 *    - If it matches the player's judoka, retry up to a safe limit.
 *    - Display the chosen judoka with `renderJudokaCard`.
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
  await renderJudokaCard(compJudoka, gokyoLookup, computerContainer, {
    animate: false
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

/**
 * Compare the chosen stat and trigger the next round.
 *
 * @pseudocode
 * 1. Evaluate the round using `evaluateRound` to update scores.
 * 2. Clear the selected state from all stat buttons.
 * 3. Call `scheduleNextRound` with the evaluation result.
 *
 * @param {string} stat - The stat name to compare.
 */
export function handleStatSelection(stat) {
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
  engineReset();
  const timerEl = document.getElementById("next-round-timer");
  if (timerEl) timerEl.textContent = "";
  const resultEl = document.getElementById("round-message");
  if (resultEl) resultEl.textContent = "";
  updateScoreDisplay();
}
