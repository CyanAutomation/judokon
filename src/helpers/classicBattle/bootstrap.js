// Side-effect imports; explicit symbols are imported by other modules when needed.
import "./promises.js";
// Ensure round UI event listeners are registered (roundStarted -> showSelectionPrompt)
import "./roundUI.js";
import "./roundCycleHistoryTracker.js";
import "../domReady.js";
import "./testHookEmitter.js";

import { ClassicBattleController } from "./controller.js";
import { ClassicBattleView } from "./view.js";
import createClassicBattleDebugAPI from "./setupTestHelpers.js";
import { onDomReady } from "../domReady.js";
import { initRoundSelectModal } from "./roundSelectModal.js";
import { isEnabled } from "../featureFlags.js";
import * as engineFacade from "../battleEngineFacade.js";
// Bridge engine events to PRD taxonomy on the classic battle event bus
import { bridgeEngineEvents } from "./engineBridge.js";
import { setupScoreboard } from "../setupScoreboard.js";
// Test API exposure for Playwright and unit tests
import { exposeClassicBattleTestAPI } from "../testing/exposeClassicBattleTestApi.js";
import { setBattleStateBadgeEnabled, bindUIHelperEventHandlers } from "./uiHelpers.js";

/**
 * @returns {boolean} True if window is globally available and accessible
 */
function canAccessWindow() {
  return typeof window !== "undefined";
}

/**
 * @returns {boolean} True if document is globally available and accessible
 */
function canAccessDocument() {
  return typeof document !== "undefined";
}

/**
 * Bootstrap Classic Battle page by wiring controller and view.
 *
 * @pseudocode
 * 1. Create the view and controller, exposing the controller's battle store globally for tests.
 * 2. Define `startCallback` which binds and initializes both, then creates the debug API.
 * 3. Await `initRoundSelectModal(startCallback)`.
 * 4. Await `startPromise` and expose readiness markers on `window`.
 * 5. Return the debug API after the round is selected.
 *
 * @returns {Promise<object|undefined>} Resolves to the debug API object when initialization completes.
 *   Returns `undefined` if not in a test environment. Rejects if initialization fails.
 */
export async function setupClassicBattlePage() {
  try {
    engineFacade.createBattleEngine?.();
  } catch (err) {
    if (typeof console !== "undefined" && typeof console.warn === "function") {
      console.warn("[classicBattle.bootstrap] Engine creation failed:", err);
    }
  }
  bridgeEngineEvents();
  let debugApi;
  const view = new ClassicBattleView();
  const controller = new ClassicBattleController();
  let resolveStart;
  let rejectStart;
  const startPromise = new Promise((resolve, reject) => {
    resolveStart = resolve;
    rejectStart = reject;
  });

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
      if (canAccessWindow()) {
        window.__initCalled = true;
      }

      // Wire the scoreboard with timer controls so visibility/focus
      // pause/resume hooks activate and DOM refs are resolved early.
      setupScoreboardWithControls(controller);
      debugApi = createClassicBattleDebugAPI(view);
      exposeDebugAPIToWindow(debugApi);
      resolveStart();
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

  await initRoundSelectModal(startCallback);

  if (canAccessWindow()) {
    try {
      window.__battleInitComplete = true;
      if (canAccessDocument()) {
        document.dispatchEvent(new Event("battle:init-complete"));
      }
      window.battleReadyPromise = startPromise;
    } catch (err) {
      if (typeof console !== "undefined" && typeof console.warn === "function") {
        console.warn("[classicBattle.bootstrap] Failed to expose readiness markers:", err);
      }
    }
  }
  startPromise.catch(() => {});
  return debugApi;
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
