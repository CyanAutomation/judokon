import { describe, it, expect, vi, beforeEach } from "vitest";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";

vi.mock("../../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));

vi.mock("../../../src/helpers/classicBattle/uiHelpers.js", () => ({
  revealComputerCard: vi.fn(),
  disableNextRoundButton: vi.fn(),
  enableNextRoundButton: vi.fn(),
  updateDebugPanel: vi.fn()
}));

describe("countdown resets after stat selection", () => {
  let battleMod;
  let store;
  beforeEach(async () => {
    document.body.innerHTML = "";
    const { playerCard, computerCard } = createBattleCardContainers();
    const header = createBattleHeader();
    const roundResult = document.createElement("p");
    roundResult.id = "round-result";
    const nextBtn = document.createElement("button");
    nextBtn.id = "next-round-button";
    document.body.append(playerCard, computerCard, header, roundResult, nextBtn);
    document.body.innerHTML += '<div id="stat-buttons"><button data-stat="power"></button></div>';
    battleMod = await import("../../../src/helpers/classicBattle.js");
    store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
  });

  it("clears timer during result animation and restarts for next round", async () => {
    document.getElementById("next-round-timer").textContent = "Time Left: 10s";
    document.getElementById("player-card").innerHTML =
      '<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>';
    document.getElementById("computer-card").innerHTML =
      '<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>';

    const timer = vi.useFakeTimers();
    const p = battleMod.handleStatSelection(store, "power");
    await vi.advanceTimersByTimeAsync(1000);
    await p;
    expect(document.getElementById("next-round-timer").textContent).toBe("");

    await vi.advanceTimersByTimeAsync(2000);
    expect(document.querySelector(".snackbar").textContent).toBe("Next round in: 3s");
    timer.clearAllTimers();
  });
});
