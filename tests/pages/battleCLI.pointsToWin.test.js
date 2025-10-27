import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BATTLE_POINTS_TO_WIN } from "../../src/config/storageKeys.js";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

function getListener(spy, type) {
  const entry = spy.mock.calls.find(([eventType]) => eventType === type);
  if (!entry) {
    throw new Error(`Expected ${type} listener to be registered`);
  }
  const listener = entry.find((param, index) => index > 0 && typeof param === "function");
  if (!listener) {
    throw new Error(`Expected ${type} listener to be a function`);
  }
  return listener;
}

async function waitForButton(testId) {
  const selector = `[data-testid="${testId}"]`;
  const immediate = document.querySelector(selector);
  if (immediate) return immediate;

  return new Promise((resolve, reject) => {
    const hasSetImmediate = typeof setImmediate === "function";
    let scheduledId = null;
    let observer;
    const clearScheduled = () => {
      if (scheduledId == null) return;
      if (hasSetImmediate) {
        clearImmediate(scheduledId);
      } else {
        clearTimeout(scheduledId);
      }
      scheduledId = null;
    };

    const cleanup = () => {
      observer.disconnect();
      clearScheduled();
    };
    const check = () => {
      const found = document.querySelector(selector);
      if (found) {
        cleanup();
        resolve(found);
        return true;
      }
      return false;
    };

    observer = new MutationObserver(() => {
      check();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    let attempts = 0;
    const maxAttempts = 50;
    const scheduleTick = () => {
      clearScheduled();
      scheduledId = hasSetImmediate ? setImmediate(tick) : setTimeout(tick, 0);
    };

    const tick = () => {
      clearScheduled();
      if (check()) return;
      attempts += 1;
      if (attempts > maxAttempts) {
        cleanup();
        reject(new Error(`Timed out waiting for ${selector}`));
        return;
      }
      scheduleTick();
    };

    scheduleTick();
  });
}

const statFixtures = {
  battleStats: ["speed", "strength"],
  stats: [
    { statIndex: 1, name: "Speed" },
    { statIndex: 2, name: "Strength" }
  ]
};

async function seedActiveRoundState() {
  const { updateRoundHeader, setRoundMessage, updateScoreLine } = await import(
    "../../src/pages/battleCLI/dom.js"
  );
  const { selectStat } = await import("../../src/pages/battleCLI/init.js");
  const facade = await import("../../src/helpers/battleEngineFacade.js");

  updateRoundHeader(7, 5);
  setRoundMessage("Fight!");
  facade.getScores.mockReturnValueOnce({ playerScore: 2, opponentScore: 3 });
  updateScoreLine();
  selectStat("speed");
}

function expectResetState(target) {
  const roundHeader = document.getElementById("cli-round");
  expect(roundHeader.textContent).toBe(`Round 0 Target: ${target}`);
  const rootElement = document.getElementById("cli-root");
  expect(rootElement.dataset.round).toBe("0");
  expect(rootElement.dataset.target).toBe(String(target));
  const scoreLine = document.getElementById("cli-score");
  expect(scoreLine.dataset.scorePlayer).toBe("0");
  expect(scoreLine.dataset.scoreOpponent).toBe("0");
  expect(scoreLine.textContent).toBe("You: 0 Opponent: 0");
  const roundMessage = document.getElementById("round-message");
  expect(roundMessage.textContent).toBe("");
  const statsList = document.getElementById("cli-stats");
  expect(statsList.dataset.selectedIndex).toBeUndefined();
  expect(statsList.querySelector(".selected")).toBeNull();
}

describe("battleCLI points select", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(async () => {
    await cleanupBattleCLI();
  });

  it("confirms and persists points to win", async () => {
    localStorage.setItem(BATTLE_POINTS_TO_WIN, "5");
    const mod = await loadBattleCLI({ ...statFixtures, pointsToWin: 5 });
    const root = mod.ensureCliDomForTest();
    const select = root.querySelector("#points-select");
    const changeSpy = vi.spyOn(select, "addEventListener");
    await mod.init();
    await mod.renderStatList();
    const { setPointsToWin, getPointsToWin } = await import(
      "../../src/helpers/battleEngineFacade.js"
    );
    setPointsToWin.mockClear();

    const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");
    await seedActiveRoundState();
    expect(document.getElementById("cli-round").textContent).toBe("Round 7 Target: 5");
    expect(document.getElementById("cli-score").textContent).toBe("You: 2 Opponent: 3");
    expect(document.getElementById("cli-stats").querySelector(".selected")).not.toBeNull();

    select.value = "10";
    const changeHandler = getListener(changeSpy, "change");
    const changePromise = changeHandler(new Event("change"));
    const confirmButton = await waitForButton("confirm-points-to-win");
    confirmButton.click();
    await changePromise;

    // Legacy confirm no longer used; ensure modal confirm occurred by side effects
    expect(setPointsToWin).toHaveBeenCalledWith(10);
    expect(getPointsToWin()).toBe(10);
    expect(emitBattleEvent).not.toHaveBeenCalledWith("startClicked");
    expect(localStorage.getItem(BATTLE_POINTS_TO_WIN)).toBe("10");

    expectResetState("10");

    setPointsToWin.mockClear();
    await mod.restorePointsToWin();
    expect(setPointsToWin).toHaveBeenCalledWith(10);
  });

  it.each([5, 10])("selecting %i updates engine state and header", async (target) => {
    localStorage.setItem(BATTLE_POINTS_TO_WIN, "10");
    const mod = await loadBattleCLI();
    const root = mod.ensureCliDomForTest();
    const select = root.querySelector("#points-select");
    const changeSpy = vi.spyOn(select, "addEventListener");
    await mod.init();
    const { setPointsToWin, getPointsToWin } = await import(
      "../../src/helpers/battleEngineFacade.js"
    );
    setPointsToWin.mockClear();

    select.value = String(target);
    const changeHandler = getListener(changeSpy, "change");
    const changePromise = changeHandler(new Event("change"));
    const confirmButton = await waitForButton("confirm-points-to-win");
    confirmButton.click();
    await changePromise;

    expect(getPointsToWin()).toBe(target);
    expect(setPointsToWin).toHaveBeenCalledWith(target);
    const roundHeader = document.getElementById("cli-round");
    expect(roundHeader.textContent).toBe(`Round 0 Target: ${target}`);
    const rootElement = document.getElementById("cli-root");
    expect(rootElement.dataset.target).toBe(String(target));
    expect(rootElement.dataset.round).toBe("0");
  });

  it("keeps target after toggling verbose", async () => {
    localStorage.setItem(BATTLE_POINTS_TO_WIN, "10");
    const mod = await loadBattleCLI();
    const root = mod.ensureCliDomForTest();
    const select = root.querySelector("#points-select");
    const checkbox = root.querySelector("#verbose-toggle");
    const selectSpy = vi.spyOn(select, "addEventListener");
    const checkboxSpy = vi.spyOn(checkbox, "addEventListener");
    await mod.init();
    const { getPointsToWin } = await import("../../src/helpers/battleEngineFacade.js");

    const selectChange = getListener(selectSpy, "change");
    select.value = "10";
    const changePromise = selectChange(new Event("change"));
    const confirmButton = await waitForButton("confirm-points-to-win");
    confirmButton.click();
    await changePromise;

    expect(getPointsToWin()).toBe(10);

    const checkboxChange = getListener(checkboxSpy, "change");

    checkbox.checked = true;
    await checkboxChange(new Event("change"));
    checkbox.checked = false;
    await checkboxChange(new Event("change"));

    const selectAfterToggle = document.getElementById("points-select");
    expect(selectAfterToggle.value).toBe("10");
    const roundHeader = document.getElementById("cli-round");
    expect(roundHeader.textContent).toBe("Round 0 Target: 10");
    const rootElement = document.getElementById("cli-root");
    expect(rootElement.dataset.target).toBe("10");
    expect(rootElement.dataset.round).toBe("0");
    expect(getPointsToWin()).toBe(10);
  });

  it("reverts selection when cancelled", async () => {
    localStorage.setItem(BATTLE_POINTS_TO_WIN, "10");
    const mod = await loadBattleCLI();
    const root = mod.ensureCliDomForTest();
    const select = root.querySelector("#points-select");
    const changeSpy = vi.spyOn(select, "addEventListener");
    await mod.init();

    const { setPointsToWin, getPointsToWin } = await import(
      "../../src/helpers/battleEngineFacade.js"
    );
    setPointsToWin.mockClear();

    expect(select.value).toBe("10");
    select.value = "3";
    const changeHandler = getListener(changeSpy, "change");
    const changePromise = changeHandler(new Event("change"));
    const cancelButton = await waitForButton("cancel-points-to-win");
    cancelButton.click();
    await changePromise;

    expect(select.value).toBe("10");
    expect(localStorage.getItem(BATTLE_POINTS_TO_WIN)).toBe("10");
    expect(getPointsToWin()).toBe(10);
    expect(setPointsToWin).not.toHaveBeenCalled();
    const roundHeader = document.getElementById("cli-round");
    expect(roundHeader.textContent).toBe("Round 0 Target: 10");
    const rootElement = document.getElementById("cli-root");
    expect(rootElement.dataset.target).toBe("10");
  });
});
