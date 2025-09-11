import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BATTLE_POINTS_TO_WIN } from "../../src/config/storageKeys.js";
import * as debugHooks from "../../src/helpers/classicBattle/debugHooks.js";
import { waitFor } from "../waitFor.js";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

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
    debugHooks.exposeDebugState("getClassicBattleMachine", undefined);
    delete window.__TEST_MACHINE__;
    await cleanupBattleCLI();
  });

  it("keeps win target when verbose toggled", async () => {
    localStorage.setItem(BATTLE_POINTS_TO_WIN, "10");
    const mod = await loadBattleCLI();
    await mod.init();
    const select = document.getElementById("points-select");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    select.value = "15";
    select.dispatchEvent(new Event("change"));
    await waitFor(() => document.getElementById("cli-round").textContent === "Round 0 Target: 15");
    const { getPointsToWin } = await import("../../src/helpers/battleEngineFacade.js");
    expect(getPointsToWin()).toBe(15);
    const checkbox = document.getElementById("verbose-toggle");
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change"));
    await waitFor(() => document.getElementById("cli-round").textContent === "Round 0 Target: 15");
    expect(getPointsToWin()).toBe(15);
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event("change"));
    await waitFor(() => document.getElementById("cli-round").textContent === "Round 0 Target: 15");
    expect(getPointsToWin()).toBe(15);
  });
});
