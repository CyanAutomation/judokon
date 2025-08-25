import { onDomReady } from "../domReady.js";
import { waitForOpponentCard } from "../battleJudokaPage.js";
import ClassicBattleController from "./controller.js";
import ClassicBattleView from "./view.js";
import "./promises.js";
// Ensure round UI event listeners are registered (roundStarted → showSelectionPrompt)
import "./roundUI.js";

/**
 * Bootstrap Classic Battle page by wiring controller and view.
 */
export async function setupClassicBattlePage() {
  /**
   * Classic Battle bootstrap.
   *
   * @pseudocode
   * 1. Create view and controller instances and bind them together.
   * 2. Initialize orchestrator / feature flags via controller.init().
   * 3. Initialize view (DOM wiring, tooltips, listeners).
   */
  const view = new ClassicBattleView({ waitForOpponentCard });
  const controller = new ClassicBattleController({
    waitForOpponentCard: view.waitForOpponentCard
  });
  view.bindController(controller);
  await controller.init();
  await view.init();
}

if (typeof process === "undefined" || process.env.VITEST !== "true") {
  onDomReady(setupClassicBattlePage);
}
