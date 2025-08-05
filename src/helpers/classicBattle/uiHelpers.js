import { getComputerJudoka, getGokyoLookup, clearComputerJudoka } from "./cardSelection.js";
import { loadSettings } from "../settingsUtils.js";
import { getScores, getTimerState, isMatchEnded } from "../battleEngine.js";
import { isTestModeEnabled, getCurrentSeed } from "../testModeUtils.js";
import { JudokaCard } from "../../components/JudokaCard.js";
import { setupLazyPortraits } from "../lazyPortrait.js";

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
 * 3. Verify the rendered card is an `HTMLElement`; log and exit if not.
 * 4. Clear the container, append the card, set up lazy portraits, and clear stored judoka.
 */
export async function revealComputerCard() {
  const judoka = getComputerJudoka();
  if (!judoka) return;
  const container = document.getElementById("computer-card");
  let settings;
  try {
    settings = await loadSettings();
  } catch {
    settings = { featureFlags: {} };
  }
  const enableInspector = Boolean(settings.featureFlags?.enableCardInspector?.enabled);
  const card = await new JudokaCard(judoka, getGokyoLookup(), {
    enableInspector
  }).render();
  if (!(card instanceof HTMLElement)) {
    console.error("revealComputerCard: rendered card is not a valid HTMLElement");
    return;
  }
  container.innerHTML = "";
  container.appendChild(card);
  setupLazyPortraits(card);
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
