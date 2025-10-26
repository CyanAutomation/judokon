import { describe, it, expect, afterEach, vi } from "vitest";
import { BATTLE_POINTS_TO_WIN } from "../../src/config/storageKeys.js";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

async function flushMicrotasks() {
  for (let i = 0; i < 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
  await new Promise((resolve) => {
    // Use zero-delay timeout to advance queued tasks without relying on fake timers
    setTimeout(resolve, 0);
  });
}

describe("battleCLI points select", () => {
  afterEach(async () => {
    await cleanupBattleCLI();
  });

  it("confirms and persists points to win", async () => {
    localStorage.setItem(BATTLE_POINTS_TO_WIN, "5");
    const mod = await loadBattleCLI();
    const root = mod.ensureCliDomForTest();
    const select = root.querySelector("#points-select");
    await mod.init();
    const header = document.getElementById("cli-round");
    const roundMessage = document.getElementById("round-message");
    const verboseLog = document.getElementById("cli-verbose-log");
    const scoreLine = document.getElementById("cli-score");
    const statsList = document.getElementById("cli-stats");

    expect(root).toBeInstanceOf(HTMLElement);
    expect(select).toBeInstanceOf(HTMLSelectElement);
    expect(header).toBeInstanceOf(HTMLElement);
    expect(roundMessage).toBeInstanceOf(HTMLElement);
    expect(verboseLog).toBeInstanceOf(HTMLElement);
    expect(scoreLine).toBeInstanceOf(HTMLElement);
    expect(statsList).toBeInstanceOf(HTMLElement);

    expect(select.value).toBe("5");

    // Preload DOM with non-default state so resetMatch effects are observable
    if (roundMessage) {
      roundMessage.textContent = "Victory!";
    }
    if (verboseLog) {
      verboseLog.textContent = "Previous log";
    }
    if (scoreLine) {
      scoreLine.dataset.scorePlayer = "3";
      scoreLine.dataset.scoreOpponent = "1";
      scoreLine.textContent = "You: 3 Opponent: 1";
    }
    if (statsList) {
      statsList.dataset.selectedIndex = "1";
      const firstStat = statsList.querySelector(".cli-stat");
      firstStat?.classList.add("selected");
      firstStat?.setAttribute("aria-selected", "true");
    }
    if (root) {
      root.dataset.round = "4";
      root.dataset.target = "20";
    }
    if (header) {
      header.textContent = "Round 4 Target: 20";
    }

    const initModule = await import("../../src/pages/battleCLI/init.js");
    const resetSpy = vi.spyOn(initModule, "resetMatch");
    const { setPointsToWin, getPointsToWin } = await import(
      "../../src/helpers/battleEngineFacade.js"
    );
    expect(getPointsToWin()).toBe(5);
    const initialCallCount = setPointsToWin.mock.calls.length;

    select.value = "10";
    select.dispatchEvent(new Event("change", { bubbles: true }));

    const confirmBtn = document.querySelector('[data-testid="confirm-points-to-win"]');
    expect(confirmBtn).toBeInstanceOf(HTMLButtonElement);
    confirmBtn?.click();

    const resetResult = resetSpy.mock.results.at(-1)?.value;
    if (resetResult && typeof resetResult.then === "function") {
      await resetResult;
    }
    await flushMicrotasks();

    expect(localStorage.getItem(BATTLE_POINTS_TO_WIN)).toBe("10");
    expect(select.value).toBe("10");
    expect(header?.textContent).toBe("Round 0 Target: 10");
    expect(root?.dataset.round).toBe("0");
    expect(root?.dataset.target).toBe("10");
    expect(roundMessage?.textContent).toBe("");
    expect(verboseLog?.textContent).toBe("");
    expect(scoreLine.dataset.scorePlayer).toBe("0");
    expect(scoreLine.dataset.scoreOpponent).toBe("0");
    expect(scoreLine.textContent).toBe("You: 0 Opponent: 0");
    expect(statsList?.dataset.selectedIndex).toBeUndefined();
    expect(Array.from(statsList?.querySelectorAll(".selected") || [])).toHaveLength(0);
    expect(document.querySelector('[data-testid="confirm-points-to-win"]')).toBeNull();

    expect(setPointsToWin.mock.calls.length).toBe(initialCallCount + 1);
    expect(setPointsToWin.mock.calls.at(-1)).toEqual([10]);
    expect(getPointsToWin()).toBe(10);

    resetSpy.mockRestore();
  });

  it.each([5, 10])("selecting %i updates engine state and header", async (target) => {
    localStorage.setItem(BATTLE_POINTS_TO_WIN, "10");
    const mod = await loadBattleCLI();
    const root = mod.ensureCliDomForTest();
    const select = root.querySelector("#points-select");
    await mod.init();
    const header = document.getElementById("cli-round");
    expect(root).toBeInstanceOf(HTMLElement);
    expect(select).toBeInstanceOf(HTMLSelectElement);
    expect(header).toBeInstanceOf(HTMLElement);
    const initModule = await import("../../src/pages/battleCLI/init.js");
    const resetSpy = vi.spyOn(initModule, "resetMatch");
    const { setPointsToWin, getPointsToWin } = await import(
      "../../src/helpers/battleEngineFacade.js"
    );
    const initialCallCount = setPointsToWin.mock.calls.length;

    select.value = String(target);
    select.dispatchEvent(new Event("change", { bubbles: true }));

    const confirmBtn = document.querySelector('[data-testid="confirm-points-to-win"]');
    expect(confirmBtn).toBeInstanceOf(HTMLButtonElement);
    confirmBtn?.click();

    const resetResult = resetSpy.mock.results.at(-1)?.value;
    if (resetResult && typeof resetResult.then === "function") {
      await resetResult;
    }
    await flushMicrotasks();

    expect(getPointsToWin()).toBe(target);
    expect(setPointsToWin.mock.calls.length).toBe(initialCallCount + 1);
    expect(setPointsToWin.mock.calls.at(-1)).toEqual([target]);
    expect(localStorage.getItem(BATTLE_POINTS_TO_WIN)).toBe(String(target));
    expect(select.value).toBe(String(target));
    expect(header?.textContent).toBe(`Round 0 Target: ${target}`);
    expect(root?.dataset.target).toBe(String(target));

    resetSpy.mockRestore();
  });

  it("reverts selection when confirmation is cancelled", async () => {
    localStorage.setItem(BATTLE_POINTS_TO_WIN, "10");
    const mod = await loadBattleCLI();
    const root = mod.ensureCliDomForTest();
    const select = root.querySelector("#points-select");
    await mod.init();
    const header = document.getElementById("cli-round");
    expect(root).toBeInstanceOf(HTMLElement);
    expect(select).toBeInstanceOf(HTMLSelectElement);
    expect(header).toBeInstanceOf(HTMLElement);

    const startingHeader = header.textContent;
    const { setPointsToWin, getPointsToWin } = await import(
      "../../src/helpers/battleEngineFacade.js"
    );
    const initialCallCount = setPointsToWin.mock.calls.length;
    const initModule = await import("../../src/pages/battleCLI/init.js");
    const resetSpy = vi.spyOn(initModule, "resetMatch");

    expect(select.value).toBe("10");
    expect(getPointsToWin()).toBe(10);

    select.value = "3";
    select.dispatchEvent(new Event("change", { bubbles: true }));

    const cancelBtn = document.querySelector('[data-testid="cancel-points-to-win"]');
    expect(cancelBtn).toBeInstanceOf(HTMLButtonElement);
    cancelBtn?.click();

    await flushMicrotasks();

    expect(document.querySelector('[data-testid="cancel-points-to-win"]')).toBeNull();
    expect(select.value).toBe("10");
    expect(header.textContent).toBe(startingHeader);
    expect(root.dataset.target).toBe("10");
    expect(localStorage.getItem(BATTLE_POINTS_TO_WIN)).toBe("10");
    expect(getPointsToWin()).toBe(10);
    expect(setPointsToWin.mock.calls.length).toBe(initialCallCount);
    expect(resetSpy).not.toHaveBeenCalled();

    resetSpy.mockRestore();
  });

  it("keeps target after toggling verbose", async () => {
    localStorage.setItem(BATTLE_POINTS_TO_WIN, "5");
    const mod = await loadBattleCLI();
    const root = mod.ensureCliDomForTest();
    const select = root.querySelector("#points-select");
    await mod.init();
    const header = document.getElementById("cli-round");
    expect(root).toBeInstanceOf(HTMLElement);
    expect(select).toBeInstanceOf(HTMLSelectElement);
    expect(header).toBeInstanceOf(HTMLElement);

    const initModule = await import("../../src/pages/battleCLI/init.js");
    const resetSpy = vi.spyOn(initModule, "resetMatch");
    const { getPointsToWin, setPointsToWin } = await import(
      "../../src/helpers/battleEngineFacade.js"
    );
    const initialCallCount = setPointsToWin.mock.calls.length;

    select.value = "10";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    const confirmBtn = document.querySelector('[data-testid="confirm-points-to-win"]');
    expect(confirmBtn).toBeInstanceOf(HTMLButtonElement);
    confirmBtn?.click();

    const resetResult = resetSpy.mock.results.at(-1)?.value;
    if (resetResult && typeof resetResult.then === "function") {
      await resetResult;
    }
    await flushMicrotasks();

    expect(getPointsToWin()).toBe(10);
    expect(select.value).toBe("10");
    expect(header?.textContent).toBe("Round 0 Target: 10");
    expect(root?.dataset.target).toBe("10");
    expect(setPointsToWin.mock.calls.length).toBe(initialCallCount + 1);
    expect(setPointsToWin.mock.calls.at(-1)).toEqual([10]);

    const { toggleVerbose } = await initModule.setupFlags();
    await toggleVerbose(true);
    await toggleVerbose(false);
    await flushMicrotasks();

    expect(select.value).toBe("10");
    expect(header?.textContent).toBe("Round 0 Target: 10");
    expect(root?.dataset.target).toBe("10");
    expect(getPointsToWin()).toBe(10);

    resetSpy.mockRestore();
  });
});
