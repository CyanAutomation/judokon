import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("timeout → interruptRound → cooldown auto-advance - minimal", () => {
  /** @type {import('vitest').FakeTimers} */
  let timers;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    if (typeof document !== "undefined") {
      document.body.innerHTML = "";
    }

    if (typeof window !== "undefined") {
      window.__promiseEvents = [];
    }

    if (typeof globalThis !== "undefined") {
      delete globalThis.__classicBattleEventTarget;
    }

    timers = vi.useFakeTimers();
  });

  afterEach(() => {
    timers?.clearAllTimers();
    timers?.useRealTimers();
    timers = undefined;

    if (typeof document !== "undefined") {
      document.body.innerHTML = "";
    }

    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function initBattle() {
    const { initClassicBattleTest } = await import("./initClassicBattle.js");
    return initClassicBattleTest({ afterMock: true });
  }

  it("initializes the battle store with expected defaults", async () => {
    const battleMod = await initBattle();
    const store = battleMod.createBattleStore();

    expect(store.selectionMade).toBe(false);
    expect(store.stallTimeoutMs).toBe(35000);
    expect(store.autoSelectId).toBeNull();
  });

  it("resolves timeout/countdown promises when timers advance", async () => {
    const battleMod = await initBattle();
    const { emitBattleEvent } = await import("../../../src/helpers/classicBattle/battleEvents.js");

    const countdownPromise = battleMod.getCountdownStartedPromise();
    const timeoutPromise = battleMod.getRoundTimeoutPromise();

    setTimeout(() => emitBattleEvent("nextRoundCountdownStarted"), 250);
    setTimeout(() => emitBattleEvent("roundTimeout"), 500);

    await vi.advanceTimersByTimeAsync(600);
    await Promise.all([countdownPromise, timeoutPromise]);

    await expect(countdownPromise).resolves.toBeUndefined();
    await expect(timeoutPromise).resolves.toBeUndefined();

    if (typeof window !== "undefined") {
      const resolveEvents = window.__promiseEvents?.filter(
        (event) =>
          event?.type === "promise-resolve" &&
          (event.key === "countdownStartedPromise" || event.key === "roundTimeoutPromise")
      );
      expect(resolveEvents?.length).toBeGreaterThanOrEqual(2);
    }
  });
});
