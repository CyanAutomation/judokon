// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from "vitest";

const { capturedDeps, modalControl, initControl } = vi.hoisted(() => ({
  capturedDeps: { current: null },
  modalControl: {
    waitForCallback: false,
    releaseCallback: null
  },
  initControl: {
    failWith: null
  }
}));

vi.mock("../../../src/helpers/domReady.js", () => ({
  onDomReady: () => {}
}));

vi.mock("../../../src/helpers/classicBattle/roundSelectModal.js", () => ({
  resolveRoundStartPolicy: vi.fn(async (callback) => {
    if (typeof callback !== "function") {
      return;
    }
    const callbackPromise = callback();
    if (modalControl.waitForCallback) {
      await callbackPromise;
      return;
    }
    await Promise.resolve();
  })
}));

vi.mock("../../../src/helpers/classicBattle/controller.js", () => ({
  ClassicBattleController: class {
    constructor(deps = {}) {
      capturedDeps.current = deps;
      this.battleStore = {};
      this.timerControls = {};
    }
    async init() {
      if (initControl.failWith) {
        throw initControl.failWith;
      }
      if (typeof modalControl.releaseCallback === "function") {
        await modalControl.releaseCallback();
      }
    }
  }
}));

vi.mock("../../../src/helpers/classicBattle/view.js", () => ({
  ClassicBattleView: class {
    bindController() {}
    async init() {}
  }
}));

vi.mock("../../../src/helpers/classicBattle/setupTestHelpers.js", () => ({
  default: () => ({ debug: true })
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
  beforeEach(() => {
    modalControl.waitForCallback = false;
    modalControl.releaseCallback = null;
    initControl.failWith = null;
    capturedDeps.current = null;
    delete window.battleReadyPromise;
  });
  test("injects waitForOpponentCard from runtime utility and uses the real implementation", async () => {
    const container = document.createElement("div");
    container.id = "opponent-card";
    const card = document.createElement("div");
    card.className = "judoka-card";
    container.appendChild(card);
    document.body.appendChild(container);
    const { createBattleClassic } = await import("../../../src/helpers/classicBattle/bootstrap.js");

    const battleClassic = createBattleClassic();
    await battleClassic.readyPromise;

    expect(typeof capturedDeps.current?.waitForOpponentCard).toBe("function");
    await expect(capturedDeps.current.waitForOpponentCard()).resolves.toBeUndefined();
  });

  test("waits for startPromise completion before resolving and setting final readiness", async () => {
    modalControl.waitForCallback = false;
    let resolveInit;
    const initBarrier = new Promise((resolve) => {
      resolveInit = resolve;
    });
    modalControl.releaseCallback = () => initBarrier;

    const { createBattleClassic } = await import("../../../src/helpers/classicBattle/bootstrap.js");

    const battleClassic = createBattleClassic();
    const bootstrapPromise = battleClassic.readyPromise;

    await Promise.resolve();
    expect(battleClassic.readyPromise).toBeInstanceOf(Promise);

    let settled = false;
    bootstrapPromise.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    resolveInit();
    await expect(bootstrapPromise).resolves.toEqual({ debug: true });
  });

  test("rejects when initialization fails", async () => {
    initControl.failWith = new Error("init failed");

    const { createBattleClassic } = await import("../../../src/helpers/classicBattle/bootstrap.js");

    const battleClassic = createBattleClassic();
    await expect(battleClassic.readyPromise).rejects.toThrow("init failed");

    initControl.failWith = null;
  });
});
