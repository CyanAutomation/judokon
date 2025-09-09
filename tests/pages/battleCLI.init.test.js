import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BATTLE_POINTS_TO_WIN } from "../../src/config/storageKeys.js";
import { waitFor } from "../waitFor.js";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";
import * as battleEvents from "../../src/helpers/classicBattle/battleEvents.js";

describe("battleCLI init helpers", () => {
  beforeEach(() => {
    localStorage.setItem(BATTLE_POINTS_TO_WIN, "5");
  });

  afterEach(async () => {
    await cleanupBattleCLI();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("emits startClicked when start button clicked", async () => {
    const mod = await loadBattleCLI({
      stats: [{ statIndex: 1, name: "Speed" }],
      mockBattleEvents: false
    });
    const emitSpy = vi.spyOn(battleEvents, "emitBattleEvent");
    await mod.init();
    const startBtn = document.getElementById("start-match-button");
    expect(startBtn).toBeTruthy();
    expect(emitSpy).not.toHaveBeenCalledWith("startClicked");
    startBtn?.click();
    await waitFor(() => emitSpy.mock.calls.some((c) => c[0] === "startClicked"));
  });

  it("shows round modal when no saved target", async () => {
    localStorage.removeItem(BATTLE_POINTS_TO_WIN);
    const mod = await loadBattleCLI({
      stats: [{ statIndex: 1, name: "Speed" }],
      mockBattleEvents: false
    });
    const emitSpy = vi.spyOn(battleEvents, "emitBattleEvent");
    await mod.init();
    document.getElementById("start-match-button")?.click();
    await waitFor(() => !!document.getElementById("round-select-title"));
    await waitFor(() => !!document.getElementById("round-select-1"));
    document.getElementById("round-select-1")?.click();
    await waitFor(() => emitSpy.mock.calls.some((c) => c[0] === "startClicked"));
  });

  it("renders stats list", async () => {
    const mod = await loadBattleCLI({
      stats: [{ statIndex: 1, name: "Speed" }],
      mockBattleEvents: false
    });
    await mod.init();
    expect(document.getElementById("cli-stats").children.length).toBeGreaterThan(0);
  });
});
