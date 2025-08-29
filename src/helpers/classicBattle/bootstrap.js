// Side-effect imports; explicit symbols are imported by other modules when needed.
import "./promises.js";
// Ensure round UI event listeners are registered (roundStarted -> showSelectionPrompt)
import "./roundUI.js";
import "../domReady.js";
import { waitForOpponentCard } from "../battleJudokaPage.js";
import { ClassicBattleController } from "./controller.js";
import { ClassicBattleView } from "./view.js";
import createClassicBattleDebugAPI from "./setupTestHelpers.js";
import { onDomReady } from "../domReady.js";
import { initRoundSelectModal } from "./roundSelectModal.js";

/**
 * Bootstrap Classic Battle page by wiring controller and view.
 *
 * @pseudocode
 * 1. Define `startCallback` which:
 *    a. Creates view and controller.
 *    b. Binds them together and initializes both.
 *    c. Creates the debug API and exposes it in test mode.
 * 2. Await `initRoundSelectModal(startCallback)`.
 * 3. Return the debug API after the round is selected.
 */
export async function setupClassicBattlePage() {
  let debugApi;
  let resolveStart;
  const startPromise = new Promise((r) => {
    resolveStart = r;
  });

  async function startCallback() {
    const view = new ClassicBattleView({ waitForOpponentCard });
    const controller = new ClassicBattleController({
      waitForOpponentCard: view.waitForOpponentCard
    });
    view.bindController(controller);
    await controller.init();
    await view.init();
    debugApi = createClassicBattleDebugAPI(view);
    if (typeof process !== "undefined" && process.env && process.env.VITEST === "true") {
      try {
        window.__classicbattledebugapi = debugApi;
      } catch {}
    }
    resolveStart();
  }

  await initRoundSelectModal(startCallback);
  await startPromise;
  return debugApi;
}

// When this module is loaded as a module script from the page, initialize
// the Classic Battle page once the DOM is ready. Tests can still import and
// call `setupClassicBattlePage` directly.
onDomReady(() => {
  // Fire-and-forget; errors are swallowed to avoid noisy failures on page load.
  setupClassicBattlePage().catch(() => {});
});
