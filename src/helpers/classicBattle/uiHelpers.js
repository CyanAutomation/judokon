import { getComputerJudoka, getGokyoLookup, clearComputerJudoka } from "./cardSelection.js";
import { loadSettings } from "../settingsUtils.js";
import { isEnabled } from "../featureFlags.js";
import { getScores, getTimerState, isMatchEnded } from "../battleEngine.js";
import { isTestModeEnabled, getCurrentSeed } from "../testModeUtils.js";
import { JudokaCard } from "../../components/JudokaCard.js";
import { setupLazyPortraits } from "../lazyPortrait.js";
import { showSnackbar } from "../showSnackbar.js";

function getDebugOutputEl() {
  return document.getElementById("debug-output");
}

/**
 * Display a snackbar prompting the player to choose a stat.
 *
 * @pseudocode
 * 1. Clear any existing text in `#round-message`.
 * 2. Show "Select your move" via `showSnackbar`.
 */
export function showSelectionPrompt() {
  const el = document.getElementById("round-message");
  if (el) {
    el.textContent = "";
  }
  showSnackbar("Select your move");
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
  try {
    await loadSettings();
  } catch {}
  const enableInspector = isEnabled("enableCardInspector");
  let card;
  try {
    card = await new JudokaCard(judoka, getGokyoLookup(), {
      enableInspector
    }).render();
  } catch (err) {
    console.error("Error rendering JudokaCard:", err);
  }
  if (card && typeof card === "object" && card.nodeType === 1) {
    container.innerHTML = "";
    container.appendChild(card);
    if (typeof IntersectionObserver !== "undefined") {
      try {
        setupLazyPortraits(card);
      } catch {}
    }
  } else {
    console.error("JudokaCard did not render an HTMLElement");
  }
  clearComputerJudoka();
}

export function enableNextRoundButton(enable = true) {
  const btn = document.getElementById("next-button");
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
