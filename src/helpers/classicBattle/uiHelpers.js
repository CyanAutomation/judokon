import {
  getOpponentJudoka,
  getGokyoLookup,
  clearOpponentJudoka,
  getOrLoadGokyoLookup
} from "./cardSelection.js";
import { loadSettings } from "../settingsStorage.js";
import { isEnabled } from "../featureFlags.js";
import { getScores, getTimerState, isMatchEnded } from "../battleEngineFacade.js";
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
 * Reveal the opponent's hidden card.
 *
 * @pseudocode
 * 1. Exit early if no stored judoka exists.
 * 2. Render `opponentJudoka` into the opponent card container.
 * 3. Clear the stored judoka after rendering.
 */
export async function revealOpponentCard() {
  const judoka = getOpponentJudoka();
  if (!judoka) return;
  const container = document.getElementById("opponent-card");
  // Preserve the debug panel across card re-renders
  const debugPanel = container ? container.querySelector("#debug-panel") : null;
  try {
    await loadSettings();
  } catch {}
  const enableInspector = isEnabled("enableCardInspector");
  let card;
  try {
    let lookup = getGokyoLookup();
    if (!lookup) {
      // Attempt to load lookup if not yet available (e.g., test env)
      lookup = await getOrLoadGokyoLookup();
    }
    if (!lookup) return; // Skip rendering silently if still unavailable
    const judokaCard = new JudokaCard(judoka, lookup, { enableInspector });
    // Be defensive: mocked modules may not expose render during tests
    if (judokaCard && typeof judokaCard.render === "function") {
      card = await judokaCard.render();
    } else {
      // Skip silently when mocks omit render in tests
      return;
    }
  } catch (err) {
    console.debug("Error rendering JudokaCard:", err);
  }
  if (card && typeof card === "object" && card.nodeType === 1) {
    container.innerHTML = "";
    if (debugPanel) container.appendChild(debugPanel);
    container.appendChild(card);
    if (typeof IntersectionObserver !== "undefined") {
      try {
        setupLazyPortraits(card);
      } catch {}
    }
  }
  clearOpponentJudoka();
}

export function enableNextRoundButton() {
  const btn = document.getElementById("next-button");
  if (!btn) return;
  btn.disabled = false;
  btn.dataset.nextReady = "true";
}

export function disableNextRoundButton() {
  const btn = document.getElementById("next-button");
  if (!btn) return;
  btn.disabled = true;
  delete btn.dataset.nextReady;
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
  try {
    if (typeof window !== "undefined" && window.__classicBattleState) {
      state.machineState = window.__classicBattleState;
      if (window.__classicBattlePrevState) state.machinePrevState = window.__classicBattlePrevState;
      if (window.__classicBattleLastEvent) state.machineLastEvent = window.__classicBattleLastEvent;
    }
  } catch {}
  pre.textContent = JSON.stringify(state, null, 2);
}
