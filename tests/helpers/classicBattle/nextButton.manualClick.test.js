import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "./commonMocks.js";
import { createRealHtmlTestEnvironment } from "../../utils/realHtmlTestUtils.js";
import { setupClassicBattleDom } from "./utils.js";
import { applyMockSetup } from "./mockSetup.js";
import { __setStateSnapshot } from "../../../src/helpers/classicBattle/battleDebug.js";

describe("Next button manual interactions", () => {
  let env;
  let cleanupDom;

  beforeEach(() => {
    const realDom = createRealHtmlTestEnvironment();
    cleanupDom = () => {
      realDom.cleanup();
      delete global.window;
      delete global.document;
    };
    const domEnv = setupClassicBattleDom();
    env = { ...domEnv, ...applyMockSetup(domEnv) };
  });

  afterEach(() => {
    __setStateSnapshot({});
    env.timerSpy?.clearAllTimers?.();
    vi.restoreAllMocks();
    cleanupDom?.();
  });

  it("marks the Next button ready when cooldown orchestrator toggles readiness", async () => {
    const { initClassicBattleTest } = await import("./initClassicBattle.js");
    await initClassicBattleTest({ afterMock: true });
    const uiHelpers = await import("../../../src/helpers/classicBattle/uiHelpers.js");
    uiHelpers.setupNextButton();

    const nextButton = document.getElementById("next-button");
    expect(nextButton).toBeInstanceOf(window.HTMLButtonElement);

    const { markNextReady } = await import(
      "../../../src/helpers/classicBattle/cooldownOrchestrator.js"
    );
    markNextReady(nextButton);

    expect(nextButton.disabled).toBe(false);
    expect(nextButton.dataset.nextReady).toBe("true");
  });

  it("resolves cooldown controls after a user clicks the ready Next button", async () => {
    const { initClassicBattleTest } = await import("./initClassicBattle.js");
    await initClassicBattleTest({ afterMock: true });
    const uiHelpers = await import("../../../src/helpers/classicBattle/uiHelpers.js");
    uiHelpers.setupNextButton();

    const roundManager = await import("../../../src/helpers/classicBattle/roundManager.js");
    const { markNextReady } = await import(
      "../../../src/helpers/classicBattle/cooldownOrchestrator.js"
    );

    const nextButton = document.getElementById("next-button");
    const store = roundManager.createBattleStore();
    const controls = roundManager.startCooldown(store);
    const readyPromise = controls.ready;

    markNextReady(nextButton);
    __setStateSnapshot({ state: "roundWait" });

    nextButton.click();
    await readyPromise;

    expect(controls.readyDispatched).toBe(true);
    expect(controls.resolveReady).toBeNull();
    expect(controls.readyInFlight).toBe(false);
    expect(nextButton.dataset.nextReady).toBe("true");

    await vi.runAllTimersAsync();
  });
});
