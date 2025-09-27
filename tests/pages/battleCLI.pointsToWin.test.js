import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BATTLE_POINTS_TO_WIN } from "../../src/config/storageKeys.js";
import * as debugHooks from "../../src/helpers/classicBattle/debugHooks.js";
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

describe("battleCLI points select", () => {
  let confirmSpy;
  let clickConfirm;

  beforeEach(() => {
    const machine = { dispatch: vi.fn() };
    debugHooks.exposeDebugState(
      "getClassicBattleMachine",
      vi.fn(() => machine)
    );
    window.__TEST_MACHINE__ = machine;
    // Hook into modal confirm button for new modal-based confirmation
    confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    clickConfirm = async () => {
      const btn = document.querySelector('[data-testid="confirm-points-to-win"]');
      if (btn) btn.click();
    };
  });

  afterEach(async () => {
    debugHooks.exposeDebugState("getClassicBattleMachine", undefined);
    delete window.__TEST_MACHINE__;
    confirmSpy.mockRestore();
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

    select.value = "10";
    const changeHandler = getListener(changeSpy, "change");
    const p = Promise.resolve().then(() => clickConfirm());
    await changeHandler(new Event("change"));
    await p;

    // Legacy confirm no longer used; ensure modal confirm occurred by side effects
    expect(setPointsToWin).toHaveBeenCalledWith(10);
    expect(getPointsToWin()).toBe(10);
    expect(emitBattleEvent).not.toHaveBeenCalledWith("startClicked");
    expect(localStorage.getItem(BATTLE_POINTS_TO_WIN)).toBe("10");

    setPointsToWin.mockClear();
    await mod.restorePointsToWin();
    expect(setPointsToWin).toHaveBeenCalledWith(10);
    confirmSpy.mockRestore();
  });

  it.each([5, 10])("selecting %i updates engine state and header", async (target) => {
    localStorage.setItem(BATTLE_POINTS_TO_WIN, "10");
    const mod = await loadBattleCLI();
    const root = mod.ensureCliDomForTest();
    const select = root.querySelector("#points-select");
    const changeSpy = vi.spyOn(select, "addEventListener");
    const domModule = await import("../../src/pages/battleCLI/dom.js");
    const updateRoundHeaderSpy = vi.spyOn(domModule, "updateRoundHeader");
    await mod.init();
    const { setPointsToWin, getPointsToWin } = await import(
      "../../src/helpers/battleEngineFacade.js"
    );
    setPointsToWin.mockClear();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    select.value = String(target);
    updateRoundHeaderSpy.mockClear();
    const changeHandler = getListener(changeSpy, "change");
    const p2 = Promise.resolve().then(() => clickConfirm());
    await changeHandler(new Event("change"));
    await p2;

    expect(getPointsToWin()).toBe(target);
    expect(setPointsToWin).toHaveBeenCalledWith(target);
    const lastHeaderCall = updateRoundHeaderSpy.mock.calls.at(-1);
    expect(lastHeaderCall).toBeDefined();
    expect(lastHeaderCall).toEqual([0, target]);
    confirmSpy.mockRestore();
    updateRoundHeaderSpy.mockRestore();
  });

  it("keeps target after toggling verbose", async () => {
    localStorage.setItem(BATTLE_POINTS_TO_WIN, "10");
    const mod = await loadBattleCLI();
    const root = mod.ensureCliDomForTest();
    const select = root.querySelector("#points-select");
    const checkbox = root.querySelector("#verbose-toggle");
    const selectSpy = vi.spyOn(select, "addEventListener");
    const checkboxSpy = vi.spyOn(checkbox, "addEventListener");
    const domModule = await import("../../src/pages/battleCLI/dom.js");
    const updateRoundHeaderSpy = vi.spyOn(domModule, "updateRoundHeader");
    await mod.init();
    const { setPointsToWin, getPointsToWin } = await import(
      "../../src/helpers/battleEngineFacade.js"
    );
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    const selectChange = getListener(selectSpy, "change");
    select.value = "10";
    const p3 = Promise.resolve().then(() => clickConfirm());
    await selectChange(new Event("change"));
    await p3;

    expect(getPointsToWin()).toBe(10);

    setPointsToWin.mockClear();
    updateRoundHeaderSpy.mockClear();
    const checkboxChange = getListener(checkboxSpy, "change");

    checkbox.checked = true;
    await checkboxChange(new Event("change"));
    checkbox.checked = false;
    await checkboxChange(new Event("change"));

    expect(setPointsToWin.mock.calls.map(([value]) => value)).toEqual([10, 10]);
    expect(updateRoundHeaderSpy.mock.calls.every(([, value]) => value === 10)).toBe(true);
    expect(updateRoundHeaderSpy.mock.calls.length).toBeGreaterThan(0);

    confirmSpy.mockRestore();
    updateRoundHeaderSpy.mockRestore();
  });
});
