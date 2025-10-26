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
    let timeoutId;
    const observer = new MutationObserver(() => {
      const found = document.querySelector(selector);
      if (found) {
        clearTimeout(timeoutId);
        observer.disconnect();
        resolve(found);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timed out waiting for ${selector}`));
    }, 1_000);
  });
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
    const mod = await loadBattleCLI();
    const root = mod.ensureCliDomForTest();
    const select = root.querySelector("#points-select");
    const changeSpy = vi.spyOn(select, "addEventListener");
    await mod.init();
    const { setPointsToWin, getPointsToWin } = await import(
      "../../src/helpers/battleEngineFacade.js"
    );
    setPointsToWin.mockClear();

    const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");

    const roundHeader = document.getElementById("cli-round");
    const scoreLine = document.getElementById("cli-score");
    const roundMessage = document.getElementById("round-message");
    const announcement = document.getElementById("match-announcement");
    const statsList = document.getElementById("cli-stats");
    const firstStat = statsList.querySelector(".cli-stat");
    const rootElement = document.getElementById("cli-root");
    roundHeader.textContent = "Round 7 Target: 5";
    rootElement.dataset.round = "7";
    rootElement.dataset.target = "5";
    scoreLine.textContent = "You: 2 Opponent: 3";
    scoreLine.dataset.scorePlayer = "2";
    scoreLine.dataset.scoreOpponent = "3";
    roundMessage.textContent = "Fight!";
    announcement.textContent = "New round incoming";
    firstStat.classList.add("selected");
    firstStat.setAttribute("aria-selected", "true");
    statsList.dataset.selectedIndex = "0";

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

    expect(roundHeader.textContent).toBe("Round 0 Target: 10");
    expect(rootElement.dataset.round).toBe("0");
    expect(rootElement.dataset.target).toBe("10");
    expect(scoreLine.dataset.scorePlayer).toBe("0");
    expect(scoreLine.dataset.scoreOpponent).toBe("0");
    expect(scoreLine.textContent).toBe("You: 0 Opponent: 0");
    expect(roundMessage.textContent).toBe("");
    expect(announcement.textContent).toBe("");
    expect(statsList.dataset.selectedIndex).toBeUndefined();
    expect(Array.from(statsList.querySelectorAll(".selected"))).toHaveLength(0);
    expect(firstStat.getAttribute("aria-selected")).toBe("false");

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
