// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from "vitest";

const { controls } = vi.hoisted(() => ({
  controls: {
    domReadyHandler: null,
    controllerInitError: null,
    viewInitError: null,
    dispatchIntent: vi.fn()
  }
}));

vi.mock("../../../src/helpers/domReady.js", () => ({
  onDomReady: (handler) => {
    controls.domReadyHandler = handler;
  }
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
    constructor() {
      this.battleStore = {};
      this.timerControls = {};
    }

    async init() {
      if (controls.controllerInitError) {
        throw controls.controllerInitError;
      }
    }
  }
}));

vi.mock("../../../src/helpers/classicBattle/view.js", () => ({
  ClassicBattleView: class {
    bindController() {}

    async init() {
      if (controls.viewInitError) {
        throw controls.viewInitError;
      }
    }
  }
}));

vi.mock("../../../src/helpers/classicBattle/setupTestHelpers.js", () => ({
  default: () => ({ debug: true })
}));

vi.mock("../../../src/helpers/classicBattle/orchestrator.js", () => ({
  registerBridgeOnEngineCreated: () => {}
}));

vi.mock("../../../src/helpers/setupScoreboard.js", () => ({
  setupScoreboard: () => {}
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

vi.mock("../../../src/helpers/featureFlags.js", () => ({
  isEnabled: () => false
}));

vi.mock("../../../src/helpers/testing/exposeClassicBattleTestApi.js", () => ({
  exposeClassicBattleTestAPI: async () => {}
}));

vi.mock("../../../src/helpers/classicBattle/battleAppService.js", () => ({
  dispatchIntent: controls.dispatchIntent
}));

describe("classic battle bootstrap failure signals", () => {
  beforeEach(() => {
    controls.domReadyHandler = null;
    controls.controllerInitError = null;
    controls.viewInitError = null;
    controls.dispatchIntent.mockReset();
    delete window.__classicBattleBootstrapFailure;
    delete window.__classicBattleBootstrapStartPromise;
  });

  test("onDomReady dispatches detectable failure signal when controller init fails", async () => {
    controls.controllerInitError = new Error("controller init failure");
    await import("../../../src/helpers/classicBattle/bootstrap.js");

    const failures = [];
    const onFailure = (event) => failures.push(event.detail);
    window.addEventListener("classicbattle:bootstrap-failed", onFailure);

    await controls.domReadyHandler?.();

    await expect(window.__classicBattleBootstrapStartPromise).rejects.toThrow(
      "controller init failure"
    );
    expect(failures).toHaveLength(1);
    expect(failures[0].phase).toBe("setup-classic-battle-page");
    expect(window.__classicBattleBootstrapFailure?.serializedError?.message).toBe(
      "controller init failure"
    );
    expect(controls.dispatchIntent).toHaveBeenCalledWith(
      "engine.bootstrap.failure",
      expect.any(Object)
    );

    window.removeEventListener("classicbattle:bootstrap-failed", onFailure);
  });
});
