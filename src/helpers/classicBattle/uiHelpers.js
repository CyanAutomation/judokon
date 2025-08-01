import { getComputerJudoka, getGokyoLookup, clearComputerJudoka } from "./cardSelection.js";
import { renderJudokaCard } from "../cardUtils.js";
import { getScores, getTimerState, isMatchEnded } from "../battleEngine.js";
import { isTestModeEnabled, getCurrentSeed } from "../testModeUtils.js";

function getDebugOutputEl() {
  return document.getElementById("debug-output");
}

/**
 * Display a persistent prompt instructing the player to choose a stat.
 *
 * @pseudocode
 * 1. Locate `#round-message` and set text to "Select your move".
 * 2. Add fade transition class and ensure the element is visible.
 */
export function showSelectionPrompt() {
  const el = document.getElementById("round-message");
  if (!el) return;
  el.classList.add("fade-transition");
  el.textContent = "Select your move";
  el.classList.remove("fading");
}

/**
 * Reveal the computer's hidden card.
 *
 * @pseudocode
 * 1. Exit early if no stored judoka exists.
 * 2. Render `computerJudoka` into the computer card container.
 * 3. Clear the stored judoka after rendering.
 */
export async function revealComputerCard() {
  const judoka = getComputerJudoka();
  if (!judoka) return;
  const container = document.getElementById("computer-card");
  await renderJudokaCard(judoka, getGokyoLookup(), container, { animate: false });
  clearComputerJudoka();
}

export function enableNextRoundButton(enable = true) {
  const btn = document.getElementById("next-round-button");
  if (btn) btn.disabled = !enable;
}

export function disableNextRoundButton() {
  enableNextRoundButton(false);
}

export function updateDebugPanel() {
  const pre = getDebugOutputEl();
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
