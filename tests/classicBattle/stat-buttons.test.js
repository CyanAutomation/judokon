import { describe, test, expect, vi } from "vitest";
import "../helpers/classicBattle/commonMocks.js";
import { setupClassicBattleHooks } from "../helpers/classicBattle/setupTestEnv.js";
import * as timerUtils from "../../src/helpers/timerUtils.js";
import { resetFallbackScores } from "../../src/helpers/api/battleUI.js";

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
    statControls.enable();
    await window.statButtonsReadyPromise;
    return statContainer;
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
      const container = await initBattle();
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
});
