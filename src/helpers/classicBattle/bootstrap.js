import { onDomReady } from "../domReady.js";
import { waitForOpponentCard } from "../opponentCardWait.js";
import ClassicBattleController from "./controller.js";
import ClassicBattleView from "./view.js";
import "./promises.js";
// Ensure round UI event listeners are registered (roundStarted → showSelectionPrompt)
import "./roundUI.js";
import { createClassicBattleDebugAPI } from "./setupTestHelpers.js";

/**
 * Bootstrap Classic Battle page by wiring controller and view.
 */
export async function setupClassicBattlePage() {
  const view = new ClassicBattleView({ waitForOpponentCard });
  const controller = new ClassicBattleController({
    waitForOpponentCard: view.waitForOpponentCard
  });
  view.bindController(controller);
  await controller.init();
  await view.init();
  const debugAPI = createClassicBattleDebugAPI(view);
  if (typeof process !== "undefined" && process.env.VITEST === "true") {
    window.__classicBattleDebugAPI = debugAPI;
  }

  // Preload optional modules during idle to reduce jank on first use
  try {
    const rIC =
      window.requestIdleCallback || ((cb) => setTimeout(() => cb({ timeRemaining: () => 0 }), 200));
    rIC(() => {
      // Tooltip library
      import("../tooltip.js").catch(() => {});
      // Test helpers / debug APIs
      import("./setupTestHelpers.js").catch(() => {});
    });
  } catch {}
  return debugAPI;
}

if (typeof process === "undefined" || process.env.VITEST !== "true") {
  onDomReady(setupClassicBattlePage);
}
