import { setupScoreboard } from "../setupScoreboard.js";
import { syncScoreboardDisplay } from "./scoreDisplay.js";
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
  const applyReplayScoreReset = () => {
    syncScoreboardDisplay(0, 0);
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
