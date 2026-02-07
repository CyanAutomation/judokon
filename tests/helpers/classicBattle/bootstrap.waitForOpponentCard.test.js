// @vitest-environment jsdom
import { describe, expect, test, vi } from "vitest";

const { capturedDeps } = vi.hoisted(() => ({
  capturedDeps: { current: null }
}));

vi.mock("../../../src/helpers/domReady.js", () => ({
  onDomReady: () => {}
}));

vi.mock("../../../src/helpers/classicBattle/roundSelectModal.js", () => ({
  resolveRoundStartPolicy: vi.fn(async (callback) => {
    if (typeof callback === "function") {
      await callback();
    }
  })
}));

vi.mock("../../../src/helpers/classicBattle/controller.js", () => ({
  ClassicBattleController: class {
    constructor(deps = {}) {
      capturedDeps.current = deps;
      this.battleStore = {};
      this.timerControls = {};
    }
    async init() {}
  }
}));

vi.mock("../../../src/helpers/classicBattle/view.js", () => ({
  ClassicBattleView: class {
    bindController() {}
    async init() {}
  }
}));

vi.mock("../../../src/helpers/classicBattle/setupTestHelpers.js", () => ({
  default: () => ({})
}));

vi.mock("../../../src/helpers/classicBattle/uiHelpers.js", () => ({
  setBattleStateBadgeEnabled: () => {},
  bindUIHelperEventHandlers: () => {}
}));

vi.mock("../../../src/helpers/classicBattle/roundUI.js", () => ({
  bindRoundUIEventHandlersDynamic: () => {}
}));

vi.mock("../../../src/helpers/classicBattle/roundFlowController.js", () => ({
  bindRoundFlowControllerOnce: () => {}
}));

vi.mock("../../../src/helpers/BattleEngine.js", () => ({
  createBattleEngine: () => {}
}));

vi.mock("../../../src/helpers/classicBattle/orchestrator.js", () => ({
  registerBridgeOnEngineCreated: () => {}
}));

vi.mock("../../../src/helpers/setupScoreboard.js", () => ({
  setupScoreboard: () => {}
}));

vi.mock("../../../src/helpers/testing/exposeClassicBattleTestApi.js", () => ({
  exposeClassicBattleTestAPI: async () => {}
}));

vi.mock("../../../src/helpers/featureFlags.js", () => ({
  isEnabled: () => false
}));

describe("classic battle bootstrap wiring", () => {
  test("injects waitForOpponentCard from runtime utility and uses the real implementation", async () => {
    document.body.innerHTML = '<div id="opponent-card"><div class="judoka-card"></div></div>';
    const { setupClassicBattlePage } = await import(
      "../../../src/helpers/classicBattle/bootstrap.js"
    );

    await setupClassicBattlePage();

    expect(typeof capturedDeps.current?.waitForOpponentCard).toBe("function");
    await expect(capturedDeps.current.waitForOpponentCard()).resolves.toBeUndefined();
  });
});
