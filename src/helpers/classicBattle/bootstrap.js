// Side-effect imports; explicit symbols are imported by other modules when needed.
import "./promises.js";
// Ensure round UI event listeners are registered (roundStarted -> showSelectionPrompt)
import "./roundUI.js";
import "./roundCycleHistoryTracker.js";
import "../domReady.js";
import "./statButtonTestSignals.js";

import { ClassicBattleController } from "./controller.js";
import { ClassicBattleView } from "./view.js";
import createClassicBattleDebugAPI from "./setupTestHelpers.js";
import { onDomReady } from "../domReady.js";
import { resolveRoundStartPolicy } from "./roundSelectModal.js";
import { isEnabled } from "../featureFlags.js";
import * as engineFacade from "../BattleEngine.js";
import { registerBridgeOnEngineCreated } from "./orchestrator.js";
import { setupScoreboard } from "../setupScoreboard.js";
// Test API exposure for Playwright and unit tests
import { exposeClassicBattleTestAPI } from "../testing/exposeClassicBattleTestApi.js";
import { setBattleStateBadgeEnabled, bindUIHelperEventHandlers } from "./uiHelpers.js";
import { bindRoundUIEventHandlersDynamic } from "./roundUI.js";
import { bindRoundFlowControllerOnce } from "./roundFlowController.js";
import { getBattleEventTarget } from "./battleEvents.js";
import { waitForOpponentCard } from "../opponentCardWait.js";
import { exposeLegacyReadinessForTests } from "./readinessCompat.js";

/**
 * @returns {boolean} True if window is globally available and accessible
 */
function canAccessWindow() {
  return typeof window !== "undefined";
}

/**
 * Create a classic battle bootstrap instance with explicit readiness lifecycle.
 *
 * @pseudocode
 * 1. Create controller/view and a single-settle `readyPromise` pair.
 * 2. Wire side effects (engine, scoreboard, state badge) and expose store for diagnostics.
 * 3. Start round-policy resolution through `controller.init()` and `view.init()` callback flow.
 * 4. Resolve/reject `readyPromise` from callback outcomes and return a disposable handle.
 *
 * @returns {{ readyPromise: Promise<object|undefined>, controller: ClassicBattleController, dispose: () => void }}
 */
export function createBattleClassic() {
  try {
    engineFacade.createBattleEngine?.();
    registerBridgeOnEngineCreated();
  } catch (err) {
    if (typeof console !== "undefined" && typeof console.warn === "function") {
      console.warn("[classicBattle.bootstrap] Engine creation failed:", err);
    }
  }
  let debugApi;
  const view = new ClassicBattleView();
  const controller = new ClassicBattleController({ waitForOpponentCard });
  let resolveStart;
  let rejectStart;
  let hasSettledStart = false;
  const readyPromise = new Promise((resolve, reject) => {
    resolveStart = (value) => {
      if (hasSettledStart) {
        return;
      }
      hasSettledStart = true;
      resolve(value);
    };
    rejectStart = (error) => {
      if (hasSettledStart) {
        return;
      }
      hasSettledStart = true;
      reject(error);
    };
  });

  if (canAccessWindow()) {
    try {
      // Single source of truth for full Classic Battle readiness.
      // @deprecated test-only global compatibility shim
      exposeLegacyReadinessForTests(readyPromise);
    } catch (err) {
      if (typeof console !== "undefined" && typeof console.warn === "function") {
        console.warn("[classicBattle.bootstrap] Failed to expose legacy readiness globals:", err);
      }
    }
  }

  if (canAccessWindow()) {
    try {
      window.battleStore = controller.battleStore;
    } catch (err) {
      if (typeof console !== "undefined" && typeof console.warn === "function") {
        console.warn("[classicBattle.bootstrap] Failed to expose battleStore:", err);
      }
    }
  }

  async function startCallback() {
    try {
      view.bindController(controller);
      await controller.init();
      await view.init();
      bindUIHelperEventHandlers();
      bindRoundFlowControllerOnce();
      // Critical: Register round UI event handlers including round.start listener
      // that dismisses countdown/opponent snackbars when Next is clicked.
      // Bug: If this call is missing, snackbars persist across rounds.
      // See: tests/helpers/classicBattle/bootstrap-event-handlers.test.js
      bindRoundUIEventHandlersDynamic();
      if (canAccessWindow()) {
        window.__initCalled = true;
        window.__handlersRegistered = true;

        // Comprehensive battle diagnostics for test synchronization
        window.__battleDiagnostics = {
          initComplete: true,
          bootstrapComplete: true,
          handlersRegistered: true,
          eventSystemReady: !!getBattleEventTarget(),
          controllerReady: !!controller,
          viewReady: !!view,
          storeReady: !!controller?.battleStore,
          timestamp: Date.now()
        };
      }

      // Wire the scoreboard with timer controls so visibility/focus
      // pause/resume hooks activate and DOM refs are resolved early.
      setupScoreboardWithControls(controller);
      debugApi = createClassicBattleDebugAPI(view);
      exposeDebugAPIToWindow(debugApi);
      resolveStart(debugApi);
    } catch (err) {
      rejectStart(err);
    }
  }

  setBattleStateBadgeEnabled(isEnabled("battleStateBadge"));

  // Ensure scoreboard layout helpers initialize before the modal mounts so
  // header clearance is reflected on first paint. The later call inside
  // `startCallback` rebinds timer controls after the modal resolves; duplicate
  // invocations are safe because `setupScoreboard` is idempotent.
  try {
    setupScoreboard({});
  } catch (error) {
    if (typeof console !== "undefined" && typeof console.warn === "function") {
      console.warn("[classicBattle.bootstrap] Early scoreboard setup failed:", error);
    }
  }

  const start = async () => {
    try {
      await resolveRoundStartPolicy(startCallback);
    } catch (error) {
      rejectStart(error);
    }
  };

  void start();

  return {
    readyPromise,
    controller,
    dispose: () => {
      // Reserved for future teardown hooks.
    }
  };
}

/**
 * Bootstrap Classic Battle page by wiring controller and view.
 *
 * @pseudocode
 * 1. Create a battle bootstrap controller through `createBattleClassic()`.
 * 2. Await the controller `readyPromise` for full init completion.
 * 3. Return the resolved debug API payload.
 *
 * @returns {Promise<object|undefined>} Resolves to the debug API object when initialization completes.
 */
export async function setupClassicBattlePage() {
  const battleClassic = createBattleClassic();
  return battleClassic.readyPromise;
}

/**
 * Setup scoreboard with timer controls after controller initialization.
 *
 * @param {object} controller - Classic battle controller with optional timerControls
 */
function setupScoreboardWithControls(controller) {
  try {
    if (controller && controller.timerControls) {
      setupScoreboard(controller.timerControls);
    } else {
      setupScoreboard({});
    }
  } catch (err) {
    if (typeof console !== "undefined" && typeof console.warn === "function") {
      console.warn("[classicBattle.bootstrap] Scoreboard setup with controls failed:", err);
    }
  }
}

/**
 * Expose the debug API to window in test environments.
 *
 * @param {object} debugApi - The debug API object to expose
 */
function exposeDebugAPIToWindow(debugApi) {
  if (
    typeof process !== "undefined" &&
    process.env &&
    process.env.VITEST === "true" &&
    canAccessWindow()
  ) {
    try {
      window.__classicbattledebugapi = debugApi;
    } catch (err) {
      if (typeof console !== "undefined" && typeof console.warn === "function") {
        console.warn("[classicBattle.bootstrap] Failed to expose debug API:", err);
      }
    }
  }
}

// When this module is loaded as a module script from the page, initialize
// the Classic Battle page once the DOM is ready. Tests can still import and
// call `setupClassicBattlePage` directly.
onDomReady(async () => {
  // Expose the Classic Battle test API without coupling to the main bootstrap flow.
  exposeClassicBattleTestAPI().catch(() => {});

  // Fire-and-forget; errors are swallowed to avoid noisy failures on page load.
  setupClassicBattlePage().catch(() => {});
});
