import { setBattleStateBadgeEnabled, applyBattleFeatureFlags } from "./uiHelpers.js";
import setupScheduler from "./setupScheduler.js";
import setupUIBindings from "./setupUIBindings.js";
import setupDebugHooks from "./setupDebugHooks.js";
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
    setupScheduler();
    this.statButtonControls = await setupUIBindings(this);
    setupDebugHooks(this);
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
