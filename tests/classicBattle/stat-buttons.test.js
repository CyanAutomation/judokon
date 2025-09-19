import { describe, test, expect, vi } from "vitest";
import "../helpers/classicBattle/commonMocks.js";
import { setupClassicBattleHooks } from "../helpers/classicBattle/setupTestEnv.js";
import * as timerUtils from "../../src/helpers/timerUtils.js";
import { resetFallbackScores } from "../../src/helpers/api/battleUI.js";
import { resetStatButtons } from "../../src/helpers/battle/battleUI.js";

describe("Classic Battle stat buttons", () => {
  const getEnv = setupClassicBattleHooks();

  async function initBattle() {
    const statContainer = document.createElement("div");
    statContainer.id = "stat-buttons";
    statContainer.dataset.buttonsReady = "false";
    statContainer.innerHTML = '<button data-stat="power"></button>';
    document.body.append(statContainer);
    const nextBtn = document.createElement("button");
    nextBtn.id = "next-button";
    nextBtn.disabled = true;
    nextBtn.textContent = "Next";
    document.body.append(nextBtn);

    const { initClassicBattleTest } = await import("../helpers/initClassicBattleTest.js");
    const battleMod = await initClassicBattleTest({ afterMock: true });
    const store = battleMod.createBattleStore();
    battleMod._resetForTest(store);

    const { setupNextButton, initStatButtons } = await import(
      "../../src/helpers/classicBattle/uiHelpers.js"
    );
    setupNextButton();
    const statControls = initStatButtons(store);
    await battleMod.startRound(store, battleMod.applyRoundUI);
    return { container: statContainer, statControls };
  }

  test("render enabled after start; clicking resolves and starts cooldown", async () => {
    resetFallbackScores();
    const { timerSpy } = getEnv();
    const spy = vi.spyOn(timerUtils, "getDefaultTimer").mockImplementation((cat) => {
      if (cat === "roundTimer") return 5;
      if (cat === "coolDownTimer") return 1;
      return 3;
    });
    try {
      const { container, statControls } = await initBattle();
      statControls.enable();
      await (window.statButtonsReadyPromise ?? Promise.resolve());
      const buttons = container.querySelectorAll("button[data-stat]");
      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach((b) => expect(b.disabled).toBe(false));

      const { getRoundResolvedPromise } = await import(
        "../../src/helpers/classicBattle/promises.js"
      );
      const resolved = getRoundResolvedPromise();
      buttons[0].click();
      await timerSpy.runAllTimersAsync();
      await resolved;

      const { getNextRoundControls } = await import(
        "../../src/helpers/classicBattle/timerService.js"
      );
      const controls = getNextRoundControls();
      const next = document.getElementById("next-button");
      const ready = controls.ready;
      timerSpy.advanceTimersByTime(1000);
      await ready;
      expect(next.disabled).toBe(false);
      expect(next.getAttribute("data-next-ready")).toBe("true");
    } finally {
      spy.mockRestore();
    }
  });

  test("stat buttons re-enable when scheduler loop is idle", async () => {
    resetFallbackScores();
    const { statControls, container } = await initBattle();
    const button = container.querySelector("button[data-stat]");
    expect(button).toBeTruthy();

    const scheduler = await import("../../src/utils/scheduler.js");
    if (typeof scheduler.stop === "function") {
      scheduler.stop();
    }

    statControls.enable();
    await (window.statButtonsReadyPromise ?? Promise.resolve());
    expect(button.disabled).toBe(false);

    const originalRAF = globalThis.requestAnimationFrame;
    const originalCancelRAF = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = undefined;
    globalThis.cancelAnimationFrame = undefined;

    try {
      resetStatButtons();
      await Promise.resolve();
      await Promise.resolve();
      expect(button.disabled).toBe(false);
    } finally {
      globalThis.requestAnimationFrame = originalRAF;
      globalThis.cancelAnimationFrame = originalCancelRAF;
    }
  });
});
