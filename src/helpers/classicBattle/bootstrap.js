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

/**
 * Bootstrap Classic Battle page by wiring controller and view.
 * Returns a debug API useful for tests.
 */
export async function setupClassicBattlePage() {
  const view = new ClassicBattleView({ waitForOpponentCard });
  const controller = new ClassicBattleController({
    waitForOpponentCard: view.waitForOpponentCard
  });
  view.bindController(controller);
  await controller.init();
  await view.init();
  const debugApi = createClassicBattleDebugAPI(view);
  if (typeof process !== "undefined" && process.env && process.env.VITEST === "true") {
    try {
      window.__classicbattledebugapi = debugApi;
    } catch {}
  }
  return debugApi;
}

// When this module is loaded as a module script from the page, initialize
// the Classic Battle page once the DOM is ready. Tests can still import and
// call `setupClassicBattlePage` directly.
onDomReady(() => {
  // Fire-and-forget; errors are swallowed to avoid noisy failures on page load.
  setupClassicBattlePage().catch(() => {});
});
