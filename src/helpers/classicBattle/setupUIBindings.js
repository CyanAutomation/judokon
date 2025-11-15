import { setupScoreboard } from "../setupScoreboard.js";
import { initQuitButton } from "./quitButton.js";
import { initInterruptHandlers } from "./interruptHandlers.js";
import {
  watchBattleOrientation,
  setupNextButton,
  initStatButtons,
  applyStatLabels
} from "./uiHelpers.js";
import { onBattleEvent } from "./battleEvents.js";
import { initBattleStateProgress } from "../battleStateProgress.js";
import { isEnabled } from "../featureFlags.js";
import { initTooltips } from "../tooltip.js";
import { handleReplay } from "./roundManager.js";

/**
 * Wire up DOM bindings for the classic battle view.
 *
 * @pseudocode
 * 1. Setup scoreboard, quit button and interrupt handlers.
 * 2. Watch orientation and initialize stat buttons and next button.
 * 3. Bind stat button state to battle events.
 * 4. Initialize battle progress, labels, tooltips and hints.
 * 5. Return `statButtonControls` for later use.
 *
 * @param {import("./view.js").ClassicBattleView} view
 * @returns {Promise<ReturnType<typeof initStatButtons>>}
 */
export async function setupUIBindings(view) {
  const store = view.controller.battleStore;
  setupScoreboard(view.controller.timerControls);
  initQuitButton(store);
  initInterruptHandlers(store);
  const applyReplayScoreReset = async () => {
    await handleReplay(store);
  };
  document.addEventListener(
    "click",
    (event) => {
      const target = event?.target;
      if (!(target instanceof Element)) {
        return;
      }

      const replayTarget = target.closest(
        '#replay-button, #match-replay-button, [data-testid="replay-button"]'
      );
      if (!replayTarget) {
        return;
      }

      applyReplayScoreReset();
    },
    { capture: true }
  );
  watchBattleOrientation(() => view.applyBattleOrientation());

  setupNextButton();
  const statButtonControls = initStatButtons(store);

  onBattleEvent("statButtons:enable", () => {
    // Don't enable buttons during states where they should be disabled
    const battleState = typeof document !== "undefined" ? document.body?.dataset?.battleState : null;
    // Prevent enabling during these states AND during waitingForPlayerAction (which might have a selection in progress)
    const statesWhereButtonsAreDisabled = ["roundDecision", "roundOver", "cooldown", "roundStart"];
    
    console.log("[statButtons:enable] Event fired, battleState:", battleState);
    
    if (typeof window !== 'undefined') {
      window.__statButtonsEnableEvents = window.__statButtonsEnableEvents || [];
      window.__statButtonsEnableEvents.push({
        time: Date.now(),
        battleState,
        willEnable: !(battleState && statesWhereButtonsAreDisabled.includes(battleState))
      });
    }
    
    if (battleState && statesWhereButtonsAreDisabled.includes(battleState)) {
      // Skip enabling buttons during these states
      console.log("[statButtons:enable] Skipping enable because battleState is", battleState);
      return;
    }
    
    // Also check if buttons are already disabled (selection in progress)
    const container = typeof document !== "undefined" ? document.getElementById("stat-buttons") : null;
    if (container && container.dataset.buttonsReady === "false") {
      console.log("[statButtons:enable] Skipping enable because buttonsReady is false");
      return;
    }
    
    console.log("[statButtons:enable] Calling enable()");
    statButtonControls?.enable();
    // Focus the first stat button for keyboard navigation
    const firstButton = document.querySelector("#stat-buttons button[data-stat]");
    if (firstButton) {
      firstButton.focus();
    }
  });
  onBattleEvent("statButtons:disable", () => statButtonControls?.disable());

  if (isEnabled("battleStateProgress")) {
    const cleanupBattleStateProgress = await initBattleStateProgress();
    if (cleanupBattleStateProgress) {
      window.addEventListener("pagehide", cleanupBattleStateProgress, { once: true });
    }
  }

  try {
    await applyStatLabels();
  } catch {}
  try {
    await initTooltips();
  } catch (error) {
    try {
      console.debug("initTooltips failed", error);
    } catch {}
  }

  return statButtonControls;
}

export default setupUIBindings;
