import { onDomReady } from "../domReady.js";
import ClassicBattleController from "./controller.js";
import ClassicBattleView from "./view.js";

/**
 * Bootstrap Classic Battle page by wiring controller and view.
 */
export async function setupClassicBattlePage() {
  const view = new ClassicBattleView();
  const controller = new ClassicBattleController({
    waitForOpponentCard: view.waitForOpponentCard
  });
  view.bindController(controller);
  await controller.init();
  await view.init();
}

if (typeof process === "undefined" || process.env.NODE_ENV !== "test") {
  onDomReady(setupClassicBattlePage);
}
