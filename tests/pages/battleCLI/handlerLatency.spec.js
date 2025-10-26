import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadBattleCLI, cleanupBattleCLI } from "../utils/loadBattleCLI.js";
import cliState from "../../../src/pages/battleCLI/state.js";
import { resetCliState } from "../../utils/battleCliTestUtils.js";

const baseOptions = {
  battleStats: ["speed", "strength"],
  stats: [
    { statIndex: 1, name: "Speed" },
    { statIndex: 2, name: "Strength" }
  ],
  html: '<div id="player-card"></div>'
};

async function setupWaitingForAction() {
  const mod = await loadBattleCLI(baseOptions);
  await mod.renderStatList();
  const list = document.getElementById("cli-stats");
  if (!list) throw new Error("Expected #cli-stats to exist after renderStatList");
  const statEl = list.querySelector(".cli-stat");
  if (!statEl) throw new Error("Expected at least one .cli-stat row to be rendered");
  statEl.focus();
  document.body.dataset.battleState = "waitingForPlayerAction";
  const { onKeyDown } = await import("../../../src/pages/index.js");
  return { mod, statEl, list, onKeyDown };
}

describe("battleCLI waitingForPlayerAction handler latency", () => {
  beforeEach(() => {
    resetCliState();
  });

  afterEach(async () => {
    await cleanupBattleCLI();
    resetCliState();
    delete document.body.dataset.battleState;
  });

  it("defers round resolution work for Enter on the focused stat", async () => {
    const { statEl, onKeyDown } = await setupWaitingForAction();
    expect(document.activeElement).toBe(statEl);

    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true
    });

    onKeyDown(event);

    expect(event.defaultPrevented).toBe(true);
    expect(cliState.roundResolving).toBe(false);
    expect(statEl.classList.contains("selected")).toBe(false);

    await Promise.resolve();

    expect(cliState.roundResolving).toBe(true);
    expect(statEl.classList.contains("selected")).toBe(true);
  });

  it("emits statSelected using the dataset stat key", async () => {
    const { statEl, onKeyDown } = await setupWaitingForAction();
    statEl.dataset.stat = "speed";
    const battleEvents = await import("../../../src/helpers/classicBattle/battleEvents.js");
    const emitSpy = battleEvents.emitBattleEvent;
    emitSpy.mockClear?.();

    onKeyDown(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })
    );

    await Promise.resolve();

    expect(emitSpy).toHaveBeenCalledWith("statSelected", { stat: "speed" });
    expect(statEl.classList.contains("selected")).toBe(true);
  });

  it("falls back to statIndex when dataset.stat is empty", async () => {
    const { statEl, onKeyDown } = await setupWaitingForAction();
    const initMod = await import("../../../src/pages/battleCLI/init.js");
    const fallbackStat = initMod.getStatByIndex("1");
    expect(fallbackStat).toBeTruthy();
    statEl.dataset.stat = "";
    statEl.dataset.statIndex = "1";
    const battleEvents = await import("../../../src/helpers/classicBattle/battleEvents.js");
    const emitSpy = battleEvents.emitBattleEvent;
    emitSpy.mockClear?.();

    onKeyDown(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })
    );

    await Promise.resolve();

    expect(emitSpy).toHaveBeenCalledWith("statSelected", { stat: fallbackStat });
    expect(statEl.classList.contains("selected")).toBe(true);
  });
});
