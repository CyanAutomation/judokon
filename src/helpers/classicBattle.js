import { generateRandomCard } from "./randomCard.js";
import { getRandomJudoka, renderJudokaCard } from "./cardUtils.js";
import { seededRandom, isTestModeEnabled, getCurrentSeed } from "./testModeUtils.js";
import { fetchJson } from "./dataUtils.js";
import { createGokyoLookup } from "./utils.js";
import { DATA_DIR } from "./constants.js";
import {
  startRound as engineStartRound,
  handleStatSelection as engineHandleStatSelection,
  quitMatch as engineQuitMatch,
  getScores,
  getTimerState,
  isMatchEnded,
  STATS,
  _resetForTest as engineReset
} from "./battleEngine.js";
import * as infoBar from "./setupBattleInfoBar.js";

import { getStatValue, resetStatButtons, showResult } from "./battle/index.js";

export function getStartRound() {
  if (typeof window !== "undefined" && window.startRoundOverride) {
    return window.startRoundOverride;
  }
  return startRound;
}

let judokaData = null;
let gokyoLookup = null;
let computerJudoka = null;

function updateDebugPanel() {
  const pre = document.getElementById("debug-output");
  if (!pre) return;
  const state = {
    ...getScores(),
    timer: getTimerState(),
    matchEnded: isMatchEnded()
  };
  if (isTestModeEnabled()) {
    state.seed = getCurrentSeed();
  }
  pre.textContent = JSON.stringify(state, null, 2);
}

/**
 * Display a persistent prompt instructing the player to choose a stat.
 *
 * @pseudocode
 * 1. Locate the `#round-message` element.
 * 2. Set the text to "Select your move".
 * 3. Add the fade transition class and ensure the element is fully visible.
 */
export function showSelectionPrompt() {
  const el = document.getElementById("round-message");
  if (!el) return;
  el.classList.add("fade-transition");
  el.textContent = "Select your move";
  el.classList.remove("fading");
}

function startTimer() {
  const timerEl = document.getElementById("next-round-timer");
  engineStartRound(
    (remaining) => {
      if (timerEl) timerEl.textContent = `Time Left: ${remaining}s`;
    },
    () => {
      const randomStat = STATS[Math.floor(seededRandom() * STATS.length)];
      infoBar.showMessage(`Time's up! Auto-selecting ${randomStat}`);
      handleStatSelection(randomStat);
    }
  );
}

export function enableNextRoundButton(enable = true) {
  const btn = document.getElementById("next-round-button");
  if (btn) btn.disabled = !enable;
}

export function disableNextRoundButton() {
  enableNextRoundButton(false);
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
 * 3. Filter out judoka marked with `isHidden`.
 * 4. Draw a random card for the player using `generateRandomCard` and capture
 *    the selected judoka.
 * 5. Select a random judoka for the computer from the filtered list.
 *    - If it matches the player's judoka, retry up to a safe limit.
 *    - Render the mystery placeholder card (`judokaId=1`) with obscured stats.
 * 6. Display the selection prompt and initialize the round timer.
 *
 * @returns {Promise<void>} Resolves when cards are displayed.
 */
export async function startRound() {
  resetStatButtons();
  disableNextRoundButton();
  if (!judokaData) {
    judokaData = await fetchJson(`${DATA_DIR}judoka.json`);
  }
  const availableJudoka = Array.isArray(judokaData) ? judokaData.filter((j) => !j.isHidden) : [];
  if (!gokyoLookup) {
    const gokyoData = await fetchJson(`${DATA_DIR}gokyo.json`);
    gokyoLookup = createGokyoLookup(gokyoData);
  }
  const playerContainer = document.getElementById("player-card");
  const computerContainer = document.getElementById("computer-card");
  let playerJudoka = null;
  await generateRandomCard(availableJudoka, null, playerContainer, false, (j) => {
    playerJudoka = j;
  });
  let compJudoka = getRandomJudoka(availableJudoka);
  if (playerJudoka) {
    // avoid showing the same judoka, but guard against infinite loops
    let attempts = 0;
    const maxAttempts = Math.max(availableJudoka.length || 0, 5);
    while (compJudoka.id === playerJudoka.id && attempts < maxAttempts) {
      compJudoka = getRandomJudoka(availableJudoka);
      attempts += 1;
    }
  }
  computerJudoka = compJudoka;
  const placeholder = judokaData.find((j) => j.id === 1) || compJudoka;
  await renderJudokaCard(placeholder, gokyoLookup, computerContainer, {
    animate: false,
    useObscuredStats: true
  });
  showSelectionPrompt();
  const { playerScore, computerScore } = getScores();
  infoBar.updateScore(playerScore, computerScore);
  startTimer();
  updateDebugPanel();
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
  {
    const { playerScore, computerScore } = getScores();
    infoBar.updateScore(playerScore, computerScore);
  }
  updateDebugPanel();
  return result;
}

/**
 * Enable the Next Round button so the player can continue.
 *
 * @pseudocode
 * 1. Exit if the match has ended.
 * 2. Locate `#next-round-button` and enable it.
 * 3. Attach a one-time click handler that:
 *    a. Disables the button.
 *    b. Calls `startRound()` to begin the next round.
 *
 * @param {{matchEnded: boolean}} result - Result from evaluateRound.
 */
export function scheduleNextRound(result) {
  if (result.matchEnded) return;

  const btn = document.getElementById("next-round-button");
  if (!btn) return;

  const onClick = async () => {
    disableNextRoundButton();
    const start = getStartRound();
    await start();
  };

  btn.addEventListener("click", onClick, { once: true });
  enableNextRoundButton();
  updateDebugPanel();
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
  updateDebugPanel();
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
  const nextBtn = document.getElementById("next-round-button");
  if (nextBtn) {
    const clone = nextBtn.cloneNode(true);
    nextBtn.replaceWith(clone);
    clone.disabled = true;
  }
  const quitBtn = document.getElementById("quit-match-button");
  if (quitBtn) {
    quitBtn.replaceWith(quitBtn.cloneNode(true));
  }
  {
    const { playerScore, computerScore } = getScores();
    infoBar.updateScore(playerScore, computerScore);
  }
  updateDebugPanel();
}

export function getComputerJudoka() {
  return computerJudoka;
}

const quitButton = document.getElementById("quit-match-button");
if (quitButton) {
  quitButton.addEventListener("click", () => {
    quitMatch();
  });
}
