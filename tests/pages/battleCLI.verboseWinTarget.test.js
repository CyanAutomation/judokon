import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BATTLE_POINTS_TO_WIN } from "../../src/config/storageKeys.js";
import * as debugHooks from "../../src/helpers/classicBattle/debugHooks.js";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

function getListener(spy, type) {
  const entry = spy.mock.calls.find(([eventType]) => eventType === type);
  if (!entry) {
    throw new Error(`Expected ${type} listener to be registered`);
  }
  const listener = entry.find((param) => typeof param === "function");
  if (!listener) {
    throw new Error(`Expected ${type} listener to be a function`);
  }
  return listener;
}

describe("battleCLI verbose win target", () => {
  beforeEach(() => {
    const machine = { dispatch: vi.fn() };
    debugHooks.exposeDebugState(
      "getClassicBattleMachine",
      vi.fn(() => machine)
    );
    window.__TEST_MACHINE__ = machine;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    debugHooks.exposeDebugState("getClassicBattleMachine", undefined);
    delete window.__TEST_MACHINE__;
    await cleanupBattleCLI();
  });

  it("keeps win target when verbose toggled", async () => {
    localStorage.setItem(BATTLE_POINTS_TO_WIN, "10");
    const mod = await loadBattleCLI();
    const root = mod.ensureCliDomForTest();
    const select = root.querySelector("#points-select");
    const changeSpy = vi.spyOn(select, "addEventListener");

    await mod.init();

    const initModule = await import("../../src/pages/battleCLI/init.js");
    const { toggleVerbose } = await initModule.setupFlags();
    expect(toggleVerbose).toEqual(expect.any(Function));

    const battleFacade = await import("../../src/helpers/battleEngineFacade.js");
    const { getPointsToWin } = battleFacade;
    const setPointsToWinSpy = vi.spyOn(battleFacade, "setPointsToWin");
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    const changeHandler = getListener(changeSpy, "change");
    select.value = "15";
    await changeHandler(new Event("change"));

    expect(getPointsToWin()).toBe(15);
    expect(localStorage.getItem(BATTLE_POINTS_TO_WIN)).toBe("15");
    confirmSpy.mockRestore();
    changeSpy.mockRestore();

    setPointsToWinSpy.mockClear();

    await toggleVerbose(true);
    await toggleVerbose(false);

    expect(setPointsToWinSpy).toHaveBeenCalledTimes(2);
    expect(setPointsToWinSpy).toHaveBeenNthCalledWith(1, 15);
    expect(setPointsToWinSpy).toHaveBeenNthCalledWith(2, 15);
    expect(getPointsToWin()).toBe(15);
    setPointsToWinSpy.mockRestore();
  });
});
