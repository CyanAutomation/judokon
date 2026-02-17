import { describe, expect, it, vi } from "vitest";
import { createStateManager } from "../../../src/helpers/classicBattle/stateManager.js";
import { CLASSIC_BATTLE_STATES } from "../../../src/helpers/classicBattle/stateTable.js";

const { emitSpy } = vi.hoisted(() => ({ emitSpy: vi.fn() }));

vi.mock("../../../src/helpers/classicBattle/battleEvents.js", async () => {
  const actual = await vi.importActual("../../../src/helpers/classicBattle/battleEvents.js");
  return {
    ...actual,
    emitBattleEvent: emitSpy
  };
});

describe("classic battle scheduler race guards", () => {
  it("accepts a single selection lock when click and timeout auto-select collide", async () => {
    emitSpy.mockClear();
    const { BattleEngine } = await import("../../../src/helpers/BattleEngine.js");
    const engine = new BattleEngine();
    const store = { roundsPlayed: 0 };

    const machine = await createStateManager(
      {},
      {
        engine,
        store
      },
      undefined,
      CLASSIC_BATTLE_STATES
    );

    await machine.dispatch("startClicked");
    await machine.dispatch("ready");
    await machine.dispatch("ready");
    await machine.dispatch("cardsRevealed");

    const [manualResult, timeoutResult] = await Promise.all([
      machine.dispatch("statSelected", {
        stat: "power",
        opts: { selectionSource: "player", intent: "statSelected", roundKey: 1 }
      }),
      machine.dispatch("statSelected", {
        stat: "speed",
        opts: { selectionSource: "auto", intent: "statSelected", roundKey: 1 }
      })
    ]);

    expect([manualResult, timeoutResult].filter(Boolean)).toHaveLength(1);

    const lockEvents = emitSpy.mock.calls.filter(
      ([eventName]) => eventName === "round.selection.locked"
    );
    expect(lockEvents).toHaveLength(1);
    expect(lockEvents[0][1]).toEqual(expect.objectContaining({ accepted: true, reason: "ok" }));

    const ignoredEvents = emitSpy.mock.calls.filter(([eventName]) => eventName === "input.ignored");
    expect(ignoredEvents.length).toBeGreaterThanOrEqual(1);
    expect(ignoredEvents.at(-1)?.[1]).toEqual(
      expect.objectContaining({ kind: "selectionLockRejected" })
    );
  });

  it("ignores selection timeout when manual selection already won the lock", async () => {
    const dispatchEvent = vi.fn();
    const emitEvent = vi.fn();
    const onExpiredSelect = vi.fn();

    const { handleTimerExpiration } = await import(
      "../../../src/helpers/classicBattle/timerService.js"
    );

    const store = { selectionMade: true };
    const onExpired = handleTimerExpiration({
      duration: 30,
      onExpiredSelect,
      store,
      scoreboardApi: { clearTimer: vi.fn() },
      isFeatureEnabled: vi.fn(() => true),
      autoSelect: vi.fn(),
      emitEvent,
      dispatchEvent,
      setSkip: vi.fn()
    });

    await onExpired();

    expect(emitEvent).toHaveBeenCalledWith("timer.selection.expired");
    expect(dispatchEvent).not.toHaveBeenCalled();
    expect(onExpiredSelect).not.toHaveBeenCalled();
  });

  it("manual next cancels pending cooldown timer before skip dispatch", async () => {
    const stop = vi.fn();
    const { onNextButtonClick } = await import(
      "../../../src/helpers/classicBattle/timerService.js"
    );
    document.body.innerHTML = '<button id="next-button"></button>';
    const button = document.getElementById("next-button");

    await onNextButtonClick(
      {
        target: button
      },
      {
        timer: { stop },
        resolveReady: null
      }
    );

    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("ignores duplicate cooldown expiry after first transition", async () => {
    const handleExpiration = vi.fn().mockResolvedValue(true);
    const { createExpirationDispatcher } = await import(
      "../../../src/helpers/classicBattle/cooldownOrchestrator.js"
    );

    const controls = { resolveReady: vi.fn() };
    const runtime = {
      timer: { on: vi.fn() },
      bus: { emit: vi.fn() },
      scheduler: { clearTimeout: vi.fn() },
      schedulerFallbackId: null,
      expired: false,
      finalizePromise: null,
      expirationOptions: {
        getStateSnapshot: () => ({ state: "roundWait" })
      }
    };

    const onExpired = createExpirationDispatcher({
      controls,
      btn: null,
      runtime,
      handleExpiration,
      getReadyDispatched: () => false
    });

    const result = await onExpired();
    await onExpired();

    expect(result).toBe(true);
    expect(handleExpiration).toHaveBeenCalledTimes(1);
    const expiredEvents = runtime.bus.emit.mock.calls.filter(
      ([eventName]) => eventName === "cooldown.timer.expired"
    );
    expect(expiredEvents).toHaveLength(1);
  });
});
