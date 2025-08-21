import { describe, it, expect, vi, beforeEach } from "vitest";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";
import { createRoundMessage, createSnackbarContainer, createTimerNodes } from "./domUtils.js";
import * as snackbar from "../../../src/helpers/showSnackbar.js";
vi.mock("../../../src/utils/scheduler.js", () => ({
  onFrame: (cb) => {
    const id = setTimeout(() => cb(performance.now()), 16);
    return id;
  },
  onSecondTick: (cb) => {
    const id = setInterval(() => cb(performance.now()), 1000);
    return id;
  },
  cancel: (id) => {
    clearTimeout(id);
    clearInterval(id);
  },
  start: vi.fn(),
  stop: vi.fn()
}));

vi.mock("../../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));

vi.mock("../../../src/helpers/classicBattle/uiHelpers.js", () => ({
  revealOpponentCard: vi.fn(),
  disableNextRoundButton: vi.fn(),
  enableNextRoundButton: vi.fn(),
  updateDebugPanel: vi.fn()
}));

describe("countdown resets after stat selection", () => {
  let battleMod;
  let store;
  beforeEach(async () => {
    document.body.innerHTML = "";
    const { playerCard, opponentCard } = createBattleCardContainers();
    const header = createBattleHeader();
    header.querySelector("#next-round-timer")?.remove();
    document.body.append(playerCard, opponentCard, header);
    createRoundMessage("round-result");
    createTimerNodes();
    document.body.innerHTML += '<div id="stat-buttons"><button data-stat="power"></button></div>';
    createSnackbarContainer();
    battleMod = await import("../../../src/helpers/classicBattle.js");
    store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
  });

  it("clears timer during result animation and restarts for next round", async () => {
    document.getElementById("next-round-timer").textContent = "Time Left: 10s";
    document.getElementById("player-card").innerHTML =
      '<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>';
    document.getElementById("opponent-card").innerHTML =
      '<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>';

    const timer = vi.useFakeTimers();
    const showSpy = vi.spyOn(snackbar, "showSnackbar");
    const updateSpy = vi.spyOn(snackbar, "updateSnackbar");
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    const p = battleMod.handleStatSelection(store, "power");
    await vi.advanceTimersByTimeAsync(1000);
    await p;
    expect(document.getElementById("next-round-timer").textContent).toBe("");

    expect(showSpy).toHaveBeenCalledWith("Next round in: 3s");
    expect(document.querySelector(".snackbar").textContent).toBe("Next round in: 3s");
    expect(document.getElementById("next-round-timer").textContent).toBe("");
    expect(document.querySelectorAll(".snackbar").length).toBe(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(updateSpy).toHaveBeenCalledWith("Next round in: 2s");
    await vi.advanceTimersByTimeAsync(1000);
    expect(updateSpy).toHaveBeenCalledWith("Next round in: 1s");
    expect(showSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect(document.getElementById("next-round-timer").textContent).toBe("");
    expect(document.querySelectorAll(".snackbar").length).toBe(1);

    timer.clearAllTimers();
    randomSpy.mockRestore();
    showSpy.mockRestore();
    updateSpy.mockRestore();
  });
});
