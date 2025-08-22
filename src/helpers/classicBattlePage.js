/**
 * Page wrapper for Classic Battle mode.
 */
import { createBattleStore, startRound } from "./classicBattle/roundManager.js";
import { applyRoundUI } from "./classicBattle/roundUI.js";
import { onDomReady } from "./domReady.js";
import { setupScoreboard } from "./setupScoreboard.js";
import { waitForOpponentCard } from "./battleJudokaPage.js";
import { initTooltips } from "./tooltip.js";
import { pauseTimer, resumeTimer } from "./battleEngineFacade.js";
import { initClassicBattleOrchestrator } from "./classicBattle/orchestrator.js";
import { initQuitButton } from "./classicBattle/quitButton.js";
import { skipCurrentPhase } from "./classicBattle/skipHandler.js";
import { initFeatureFlags, isEnabled, featureFlagsEmitter } from "./featureFlags.js";
import { initInterruptHandlers } from "./classicBattle/interruptHandlers.js";
import { start as startScheduler, stop as stopScheduler } from "../utils/scheduler.js";
import {
  watchBattleOrientation,
  registerRoundStartErrorHandler,
  setupNextButton,
  initStatButtons,
  applyStatLabels,
  setBattleStateBadgeEnabled,
  applyBattleFeatureFlags,
  initDebugPanel,
  maybeShowStatHint
} from "./classicBattle/uiHelpers.js";
import "./setupBottomNavbar.js";
import "./setupDisplaySettings.js";
import "./setupSvgFallback.js";
import "./setupClassicBattleHomeLink.js";
import { initBattleStateProgress } from "./battleStateProgress.js";

const battleStore = createBattleStore();
window.battleStore = battleStore;
window.skipBattlePhase = skipCurrentPhase;
export const getBattleStore = () => battleStore;
let statButtonControls;

async function startRoundWrapper() {
  statButtonControls?.disable();
  try {
    const { roundNumber } = await startRound(battleStore);
    applyRoundUI(battleStore, roundNumber);
    await waitForOpponentCard(5000);
  } catch (error) {
    console.error("Error starting round:", error);
    document.dispatchEvent(new CustomEvent("round-start-error", { detail: error }));
  } finally {
    statButtonControls?.enable();
  }
}

export async function setupClassicBattlePage() {
  try {
    if (typeof window !== "undefined") {
      window.__buildTag = "classic-battle-guard-v1";
    }
  } catch {}
  if (!(typeof process !== "undefined" && process.env.VITEST)) {
    startScheduler();
    window.addEventListener("pagehide", stopScheduler, { once: true });
  }
  setupScoreboard();
  initQuitButton(battleStore);
  initInterruptHandlers(battleStore);
  watchBattleOrientation();
  await initFeatureFlags();
  try {
    if (isEnabled("enableTestMode")) {
      window.__disableSnackbars = true;
    }
  } catch {}
  setupNextButton();
  setBattleStateBadgeEnabled(isEnabled("battleStateBadge"));
  featureFlagsEmitter.addEventListener("change", () => {
    setBattleStateBadgeEnabled(isEnabled("battleStateBadge"));
  });

  statButtonControls = initStatButtons(battleStore);

  const battleArea = document.getElementById("battle-area");
  const banner = document.getElementById("test-mode-banner");
  applyBattleFeatureFlags(battleArea, banner);

  initDebugPanel();
  registerRoundStartErrorHandler(startRoundWrapper);

  window.startRoundOverride = () => startRoundWrapper();
  const cleanupBattleStateProgress = await initBattleStateProgress();
  if (cleanupBattleStateProgress) {
    window.addEventListener("pagehide", cleanupBattleStateProgress, { once: true });
  }
  await initClassicBattleOrchestrator(battleStore, startRoundWrapper);
  applyStatLabels().catch(() => {});
  await initTooltips();
  maybeShowStatHint();

  try {
    window.freezeBattleHeader = () => {
      try {
        pauseTimer();
        try {
          stopScheduler();
        } catch {}
      } catch {}
    };
    window.resumeBattleHeader = () => {
      try {
        try {
          startScheduler();
        } catch {}
        resumeTimer();
      } catch {}
    };
  } catch {}
}

if (typeof process === "undefined" || process.env.NODE_ENV !== "test") {
  onDomReady(setupClassicBattlePage);
}
