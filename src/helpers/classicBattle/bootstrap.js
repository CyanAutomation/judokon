// Side-effect imports; explicit symbols are imported by other modules when needed.
import "./promises.js";
// Ensure round UI event listeners are registered (roundStarted -> showSelectionPrompt)
import "./roundUI.js";
import "./roundCycleHistoryTracker.js";
import "../domReady.js";

import { ClassicBattleController } from "./controller.js";
import { ClassicBattleView } from "./view.js";
import createClassicBattleDebugAPI from "./setupTestHelpers.js";
import { onDomReady } from "../domReady.js";
import { initRoundSelectModal } from "./roundSelectModal.js";
import * as engineFacade from "../battleEngineFacade.js";
// Bridge engine events to PRD taxonomy on the classic battle event bus
import { bridgeEngineEvents } from "./engineBridge.js";
import { setupScoreboard } from "../setupScoreboard.js";
// Test API exposure for Playwright and unit tests
import { exposeClassicBattleTestAPI } from "../testing/exposeClassicBattleTestApi.js";

/**
 * Bootstrap Classic Battle page by wiring controller and view.
 *
 * @pseudocode
 * 1. Define `startCallback` which:
 *    a. Creates view and controller.
 *    b. Binds them together and initializes both.
 *    c. Creates the debug API and exposes it in test mode.
 *    d. Resolves or rejects `startPromise` based on initialization outcome.
 * 2. Await `initRoundSelectModal(startCallback)`.
 * 3. Await `startPromise`.
 * 4. Return the debug API after the round is selected.
 *
 * @returns {Promise<object|undefined>} Resolves to the debug API object when initialization completes (or `undefined` if not available).
 */
export async function setupClassicBattlePage() {
  try {
    engineFacade.createBattleEngine?.();
  } catch {}
  bridgeEngineEvents();
  let debugApi;
  let resolveStart;
  let rejectStart;
  const startPromise = new Promise((resolve, reject) => {
    resolveStart = resolve;
    rejectStart = reject;
  });

  async function startCallback() {
    try {
      const view = new ClassicBattleView();
      const controller = new ClassicBattleController();
      view.bindController(controller);
      await controller.init();
      await view.init();
      if (typeof window !== "undefined") {
        window.__initCalled = true;
      }

      // Wire the scoreboard with timer controls so visibility/focus
      // pause/resume hooks activate and DOM refs are resolved early.
      try {
        if (controller && controller.timerControls) {
          setupScoreboard(controller.timerControls);
        } else {
          setupScoreboard({});
        }
      } catch {}

      debugApi = createClassicBattleDebugAPI(view);
      if (typeof process !== "undefined" && process.env && process.env.VITEST === "true") {
        try {
          window.__classicbattledebugapi = debugApi;
        } catch {}
      }
      resolveStart();
    } catch (err) {
      rejectStart(err);
    }
  }

  await initRoundSelectModal(startCallback);

  if (typeof window !== "undefined") {
    try {
      window.__battleInitComplete = true;
      if (typeof document !== "undefined") {
        document.dispatchEvent(new Event("battle:init-complete"));
      }
      window.battleReadyPromise = startPromise;
    } catch {}
  }
  startPromise.catch(() => {});
  return debugApi;
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
