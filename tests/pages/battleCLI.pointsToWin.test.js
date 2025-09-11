import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BATTLE_POINTS_TO_WIN } from "../../src/config/storageKeys.js";
import * as debugHooks from "../../src/helpers/classicBattle/debugHooks.js";
import { waitFor } from "../waitFor.js";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

describe("battleCLI points select", () => {
  beforeEach(() => {
    const machine = { dispatch: vi.fn() };
    debugHooks.exposeDebugState(
      "getClassicBattleMachine",
      vi.fn(() => machine)
    );
    window.__TEST_MACHINE__ = machine;
  });

  afterEach(async () => {
    debugHooks.exposeDebugState("getClassicBattleMachine", undefined);
    delete window.__TEST_MACHINE__;
    await cleanupBattleCLI();
  });

  it("confirms and persists points to win", async () => {
    localStorage.setItem(BATTLE_POINTS_TO_WIN, "5");
    const mod = await loadBattleCLI();
    await mod.init();
    const { setPointsToWin } = await import("../../src/helpers/battleEngineFacade.js");
    setPointsToWin.mockClear();

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");

    const select = document.getElementById("points-select");
    select.value = "15";
    select.dispatchEvent(new Event("change"));
    await waitFor(() => setPointsToWin.mock.calls.length > 0);

    expect(confirmSpy).toHaveBeenCalled();
    expect(setPointsToWin).toHaveBeenCalledWith(15);
    expect(emitBattleEvent).not.toHaveBeenCalledWith("startClicked");
    expect(localStorage.getItem(BATTLE_POINTS_TO_WIN)).toBe("15");

    setPointsToWin.mockClear();
    await mod.restorePointsToWin();
    expect(setPointsToWin).toHaveBeenCalledWith(15);
    expect(select.value).toBe("15");
  });

  it.each([5, 15])("selecting %i updates engine state and header", async (target) => {
    localStorage.setItem(BATTLE_POINTS_TO_WIN, "10");
    const mod = await loadBattleCLI();
    await mod.init();
    const { setPointsToWin, getPointsToWin } = await import(
      "../../src/helpers/battleEngineFacade.js"
    );
    setPointsToWin.mockClear();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const select = document.getElementById("points-select");
    select.value = String(target);
    select.dispatchEvent(new Event("change"));

    await waitFor(() => getPointsToWin() === target);
    await waitFor(
      () => document.getElementById("cli-round").textContent === `Round 0 Target: ${target}`
    );

    expect(getPointsToWin()).toBe(target);
    expect(setPointsToWin).toHaveBeenCalledWith(target);
    expect(document.getElementById("cli-round").textContent).toBe(`Round 0 Target: ${target}`);
  });

  it("keeps target after toggling verbose", async () => {
    localStorage.setItem(BATTLE_POINTS_TO_WIN, "10");
    const mod = await loadBattleCLI();
    await mod.init();
    const select = document.getElementById("points-select");
    vi.spyOn(window, "confirm").mockReturnValue(true);

    select.value = "15";
    select.dispatchEvent(new Event("change"));
    await waitFor(() => document.getElementById("cli-round").textContent === "Round 0 Target: 15");

    const checkbox = document.getElementById("verbose-toggle");
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change"));
    await waitFor(() => document.getElementById("cli-round").textContent === "Round 0 Target: 15");

    checkbox.checked = false;
    checkbox.dispatchEvent(new Event("change"));
    await waitFor(() => document.getElementById("cli-round").textContent === "Round 0 Target: 15");
    expect(document.getElementById("cli-round").textContent).toBe("Round 0 Target: 15");
  });
});
