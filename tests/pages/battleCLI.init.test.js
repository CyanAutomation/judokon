import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { withMutedConsole } from "../utils/console.js";
import { BATTLE_POINTS_TO_WIN } from "../../src/config/storageKeys.js";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

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
    // Import after mocks are set up by loadBattleCLI
    const { dispatchBattleEvent } = await import("../../src/helpers/classicBattle/orchestrator.js");
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

  it("emits battle.unavailable and does not manually progress state when the orchestrator is unavailable", async () => {
    const mod = await loadBattleCLI();
    await mod.init();
    const battleEvents = await import("../../src/helpers/classicBattle/battleEvents.js");
    const emitBattleEvent = battleEvents.emitBattleEvent;
    if (!vi.isMockFunction(emitBattleEvent)) {
      throw new Error("emitBattleEvent mock unavailable");
    }
    emitBattleEvent.mockClear();
    const debugHooks = await import("../../src/helpers/classicBattle/debugHooks.js");
    debugHooks.exposeDebugState("getClassicBattleMachine", undefined);
    const { dispatchBattleEvent } = await import("../../src/helpers/classicBattle/orchestrator.js");
    dispatchBattleEvent.mockRejectedValue(new Error("machine unavailable"));
    const battleCliModule = await import("../../src/pages/battleCLI/init.js");

    const initialBattleState = document.body.dataset.battleState;

    await withMutedConsole(async () => {
      await battleCliModule.triggerMatchStart();
    });

    const stateChangeCalls = emitBattleEvent.mock.calls
      .filter(([type]) => type === "battleStateChange")
      .map(([, detail]) => detail?.to ?? null);
    expect(stateChangeCalls).toEqual([]);

    expect(emitBattleEvent).toHaveBeenCalledWith(
      "battle.unavailable",
      expect.objectContaining({
        action: "startClicked",
        reason: "no_machine"
      })
    );
    expect(document.body.dataset.battleState).toBe(initialBattleState);
    expect(document.getElementById("cli-countdown")?.dataset.status).toBe("error");
  });

  it("returns explicit failure contract when safeDispatch has no machine", async () => {
    const mod = await loadBattleCLI();
    await mod.init();
    const debugHooks = await import("../../src/helpers/classicBattle/debugHooks.js");
    debugHooks.exposeDebugState("getClassicBattleMachine", undefined);
    const { dispatchBattleEvent } = await import("../../src/helpers/classicBattle/orchestrator.js");
    dispatchBattleEvent.mockImplementation(() => {
      throw new Error("machine unavailable");
    });
    const battleCliModule = await import("../../src/pages/battleCLI/init.js");

    const result = await battleCliModule.safeDispatch("startClicked");
    expect(result).toMatchObject({
      ok: false,
      eventName: "startClicked",
      reason: "no_machine"
    });
  });

  it("blocks direct battleStateChange injection from forcing progression", async () => {
    const mod = await loadBattleCLI();
    await mod.init();
    const battleEvents = await import("../../src/helpers/classicBattle/battleEvents.js");
    const debugHooks = await import("../../src/helpers/classicBattle/debugHooks.js");
    debugHooks.exposeDebugState("getClassicBattleMachine", undefined);
    const emitBattleEvent = battleEvents.emitBattleEvent;
    if (!vi.isMockFunction(emitBattleEvent)) {
      throw new Error("emitBattleEvent mock unavailable");
    }
    emitBattleEvent.mockClear();

    // Establish the guard precondition via the runtime event path so the test
    // exercises the same listener wiring used in production.
    emitBattleEvent("battleStateChange", { to: "waitingForMatchStart", event: "startClicked" });
    expect(document.body.dataset.battleState).toBe("waitingForMatchStart");

    emitBattleEvent("battleStateChange", { to: "roundSelect" });

    expect(document.body.dataset.battleState).not.toBe("roundSelect");
    expect(emitBattleEvent).toHaveBeenCalledWith(
      "battle.unavailable",
      expect.objectContaining({
        action: "stateTransition",
        reason: "state_injection_blocked",
        attemptedTo: "roundSelect"
      })
    );
    expect(document.getElementById("cli-countdown")?.dataset.status).toBe("error");
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
