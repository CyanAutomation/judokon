import { waitForOpponentCard } from "../battleJudokaPage.js";
import { setupScoreboard } from "../setupScoreboard.js";
import { initQuitButton } from "./quitButton.js";
import { skipCurrentPhase } from "./skipHandler.js";
import { initInterruptHandlers } from "./interruptHandlers.js";
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
} from "./uiHelpers.js";
import { initBattleStateProgress } from "../battleStateProgress.js";
import { initTooltips } from "../tooltip.js";
import { start as startScheduler, stop as stopScheduler } from "../../utils/scheduler.js";
import { pauseTimer, resumeTimer } from "../battleEngineFacade.js";
import "../setupBottomNavbar.js";
import "../setupDisplaySettings.js";
import "../setupSvgFallback.js";
import "../setupClassicBattleHomeLink.js";

/**
 * View layer for Classic Battle mode.
 * Handles DOM interactions and binds to controller events.
 */
export class ClassicBattleView {
  constructor() {
    this.statButtonControls = null;
    this.waitForOpponentCard = waitForOpponentCard;
  }

  /**
   * Bind controller events to view handlers.
   * @param {import("./controller.js").ClassicBattleController} controller
   */
  bindController(controller) {
    this.controller = controller;
    controller.addEventListener("featureFlagsChange", () => {
      setBattleStateBadgeEnabled(controller.isEnabled("battleStateBadge"));
      try {
        window.__disableSnackbars = controller.isEnabled("enableTestMode");
      } catch {}
      const battleArea = document.getElementById("battle-area");
      const banner = document.getElementById("test-mode-banner");
      applyBattleFeatureFlags(battleArea, banner);
    });
    controller.addEventListener("roundStartError", (e) => {
      document.dispatchEvent(new CustomEvent("round-start-error", { detail: e.detail }));
    });
  }

  /**
   * Initialize UI and side effects.
   * @returns {Promise<void>}
   */
  async init() {
    const store = this.controller.battleStore;
    window.battleStore = store;
    window.skipBattlePhase = skipCurrentPhase;

    if (!(typeof process !== "undefined" && process.env.VITEST)) {
      startScheduler();
      window.addEventListener("pagehide", stopScheduler, { once: true });
    }

    setupScoreboard();
    initQuitButton(store);
    initInterruptHandlers(store);
    watchBattleOrientation(() => this.applyBattleOrientation());

    setupNextButton();
    this.statButtonControls = initStatButtons(store);

    initDebugPanel();
    registerRoundStartErrorHandler(() => this.startRound());

    const cleanupBattleStateProgress = await initBattleStateProgress();
    if (cleanupBattleStateProgress) {
      window.addEventListener("pagehide", cleanupBattleStateProgress, {
        once: true
      });
    }

    await applyStatLabels().catch(() => {});
    await initTooltips();
    maybeShowStatHint();

    try {
      window.startRoundOverride = () => this.startRound();
      window.freezeBattleHeader = () => {
        try {
          pauseTimer();
          stopScheduler();
        } catch {}
      };
      window.resumeBattleHeader = () => {
        try {
          startScheduler();
          resumeTimer();
        } catch {}
      };
    } catch {}
  }

  /** @returns {"portrait"|"landscape"} */
  getOrientation() {
    try {
      const portrait = window.innerHeight >= window.innerWidth;
      if (typeof window.matchMedia === "function") {
        const mm = window.matchMedia("(orientation: portrait)");
        if (typeof mm.matches === "boolean" && mm.matches !== portrait) {
          return portrait ? "portrait" : "landscape";
        }
        return mm.matches ? "portrait" : "landscape";
      }
      return portrait ? "portrait" : "landscape";
    } catch {
      return window.innerHeight >= window.innerWidth ? "portrait" : "landscape";
    }
  }

  /**
   * Applies current orientation to header.
   * @returns {boolean}
   */
  applyBattleOrientation() {
    const header = document.querySelector(".battle-header");
    if (header) {
      const next = this.getOrientation();
      if (header.dataset.orientation !== next) {
        header.dataset.orientation = next;
      }
      return true;
    }
    return false;
  }

  /**
   * Wrapper around controller's startRound with UI state management.
   * @returns {Promise<void>}
   */
  async startRound() {
    this.statButtonControls?.disable();
    try {
      await this.controller.startRound();
    } catch {
      // error already dispatched
    } finally {
      this.statButtonControls?.enable();
    }
  }
}

export default ClassicBattleView;
