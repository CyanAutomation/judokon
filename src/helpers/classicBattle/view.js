import { setupScoreboard } from "../setupScoreboard.js";
import { resetStatButtons } from "../battle/index.js";
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
import { onBattleEvent } from "./battleEvents.js";
import { initBattleStateProgress } from "../battleStateProgress.js";
import { initTooltips } from "../tooltip.js";
import { start as startScheduler, stop as stopScheduler } from "../../utils/scheduler.js";
import "../setupBottomNavbar.js";
import "../setupDisplaySettings.js";
import "../setupSvgFallback.js";
import "../setupClassicBattleHomeLink.js";

/**
 * View layer for Classic Battle mode.
 * Handles DOM interactions and binds to controller events.
 */
export class ClassicBattleView {
  /**
   * @param {{ waitForOpponentCard?: () => Promise<void> }} [deps]
   */
  constructor({ waitForOpponentCard = () => {} } = {}) {
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
    // Provide a robust skip helper: invoke the skip handler and return a
    // Promise that resolves when either the next-round timer path completes
    // or the next round prompts the player again. This makes tests deterministic
    // and avoids racing the handler registration.
    window.skipBattlePhase = () => {
      try {
        // Trigger skip (may be pending until a handler is set)
        skipCurrentPhase();
      } catch {}
      // Clear any lingering selection immediately for deterministic tests
      try {
        resetStatButtons();
      } catch {}
      try {
        const p1 =
          typeof window !== "undefined" && window.nextRoundTimerReadyPromise
            ? window.nextRoundTimerReadyPromise
            : Promise.resolve();
        const p2 =
          typeof window !== "undefined" && window.roundPromptPromise
            ? window.roundPromptPromise
            : Promise.resolve();
        try {
          console.warn("[test] skipBattlePhase: awaiting timerReady or next round prompt");
        } catch {}
        return Promise.race([p1, p2]);
      } catch {
        return Promise.resolve();
      }
    };

    if (!(typeof process !== "undefined" && process.env.VITEST)) {
      startScheduler();
      window.addEventListener("pagehide", stopScheduler, { once: true });
    }

    setupScoreboard(this.controller.timerControls);
    initQuitButton(store);
    initInterruptHandlers(store);
    watchBattleOrientation(() => this.applyBattleOrientation());

    setupNextButton();
    this.statButtonControls = initStatButtons(store);
    onBattleEvent("statButtons:enable", () => this.statButtonControls?.enable());
    onBattleEvent("statButtons:disable", () => this.statButtonControls?.disable());

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
          this.controller.timerControls.pauseTimer();
          stopScheduler();
        } catch {}
      };
      window.resumeBattleHeader = () => {
        try {
          startScheduler();
          this.controller.timerControls.resumeTimer();
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
   *
   * @pseudocode
   * 1. Query `.battle-header`; resolve `false` if missing.
   * 2. Determine orientation via `getOrientation`.
   * 3. Update `data-orientation` when changed.
   * 4. Resolve `true` once attributes are set.
   *
   * @returns {Promise<boolean>} Resolves `true` when applied, `false` if header missing.
   */
  async applyBattleOrientation() {
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
