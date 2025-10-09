import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { withMutedConsole } from "../utils/console.js";
import { BATTLE_POINTS_TO_WIN } from "../../src/config/storageKeys.js";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";
import { dispatchBattleEvent } from "../../src/helpers/classicBattle/orchestrator.js";
import { useCanonicalTimers } from "../setup/fakeTimers.js";

describe("battleCLI init helpers", () => {
  beforeEach(() => {
    localStorage.setItem(BATTLE_POINTS_TO_WIN, "5");
  });

  afterEach(async () => {
    await cleanupBattleCLI();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("emits startClicked when the start helper runs", async () => {
    const mod = await loadBattleCLI({
      stats: [{ statIndex: 1, name: "Speed" }],
      mockBattleEvents: false
    });
    await mod.init();
    const battleEvents = await import("../../src/helpers/classicBattle/battleEvents.js");
    const emitter = battleEvents.getBattleEventTarget?.();
    if (!emitter) {
      throw new Error("Battle event emitter unavailable");
    }
    dispatchBattleEvent.mockClear();
    const battleCliModule = await import("../../src/pages/battleCLI/init.js");
    const startClickedListener = vi.fn();
    const startClicked = new Promise((resolve) =>
      emitter.addEventListener(
        "startClicked",
        (event) => {
          startClickedListener(event);
          resolve(event);
        },
        { once: true }
      )
    );
    expect(startClickedListener).not.toHaveBeenCalled();
    await battleCliModule.triggerMatchStart();
    await startClicked;
    expect(startClickedListener).toHaveBeenCalledTimes(1);
    expect(dispatchBattleEvent).toHaveBeenCalledWith("startClicked");
  });

  it("progresses battle states manually when the orchestrator is unavailable", async () => {
    const timers = useCanonicalTimers();
    try {
      const mod = await loadBattleCLI();
      await mod.init();
      const battleEvents = await import("../../src/helpers/classicBattle/battleEvents.js");
      const emitBattleEvent = battleEvents.emitBattleEvent;
      if (!vi.isMockFunction(emitBattleEvent)) {
        throw new Error("emitBattleEvent mock unavailable");
      }
      emitBattleEvent.mockClear();
      const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
      const initialTimerCalls = setTimeoutSpy.mock.calls.length;
      const debugHooks = await import("../../src/helpers/classicBattle/debugHooks.js");
      debugHooks.exposeDebugState("getClassicBattleMachine", undefined);
      const { dispatchBattleEvent } = await import(
        "../../src/helpers/classicBattle/orchestrator.js"
      );
      dispatchBattleEvent.mockResolvedValue(false);
      const battleCliModule = await import("../../src/pages/battleCLI/init.js");
      const { MANUAL_FALLBACK_DELAY_MS } = battleCliModule;
      await withMutedConsole(async () => {
        const startPromise = battleCliModule.triggerMatchStart();
        await timers.runAllTimersAsync();
        await startPromise;
      });
      const stateChangeCalls = emitBattleEvent.mock.calls
        .filter(([type]) => type === "battleStateChange")
        .map(([, detail]) => detail?.to ?? null);
      expect(stateChangeCalls).toEqual([
        "matchStart",
        "cooldown",
        "roundStart",
        "waitingForPlayerAction"
      ]);
      const manualTimerCalls = setTimeoutSpy.mock.calls.slice(initialTimerCalls);
      const fallbackTimers = manualTimerCalls
        .filter(([, delay]) => delay === MANUAL_FALLBACK_DELAY_MS)
        .slice(0, 3);
      expect(fallbackTimers).toHaveLength(3);
      expect(fallbackTimers.map(([, delay]) => delay)).toEqual([
        MANUAL_FALLBACK_DELAY_MS,
        MANUAL_FALLBACK_DELAY_MS,
        MANUAL_FALLBACK_DELAY_MS
      ]);
    } finally {
      timers.cleanup();
    }
  });

  it("renders stats list", async () => {
    const mod = await loadBattleCLI({
      mockBattleEvents: false
    });
    await mod.init();
    const stats = await mod.loadStatDefs();
    expect(stats.find((stat) => stat.statIndex === 1)).toMatchObject({ name: "Power" });
    const rows = mod.buildStatRows(stats);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((row) => row.textContent?.includes("Power"))).toBe(true);
  });
});
