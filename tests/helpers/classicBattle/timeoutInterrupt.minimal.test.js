import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import installRAFMock from "../rafMock.js";

describe("timeout → interruptRound → cooldown auto-advance - minimal", () => {
  /** @type {import('vitest').FakeTimers} */
  let timers;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    // Install shared RAF mock for deterministic frame control
    const raf = installRAFMock();
    global.__timeoutInterruptRafRestore = raf.restore;

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

    try {
      global.__timeoutInterruptRafRestore?.();
      try {
        delete global.__timeoutInterruptRafRestore;
      } catch {}
    } catch {}

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

  it("can get promises without hanging", async () => {
    const battleMod = await initBattle();
    const { emitBattleEvent } = await import("../../../src/helpers/classicBattle/battleEvents.js");

    if (typeof document !== "undefined") {
      const container = document.createElement("div");
      container.id = "snackbar-container";
      document.body.appendChild(container);
    }

    const countdownPromise = battleMod.getCountdownStartedPromise();
    const timeoutPromise = battleMod.getRoundTimeoutPromise();

    const initialCountdownRef =
      typeof window !== "undefined" ? window.countdownStartedPromise : undefined;
    const initialTimeoutRef =
      typeof window !== "undefined" ? window.roundTimeoutPromise : undefined;

    setTimeout(() => emitBattleEvent("countdownStart", { duration: 1 }), 10);
    setTimeout(() => emitBattleEvent("roundTimeout"), 400);

    await vi.advanceTimersByTimeAsync(1200);
    const [countdownResult, timeoutResult] = await Promise.all([countdownPromise, timeoutPromise]);

    expect(countdownResult).toBeUndefined();
    expect(timeoutResult).toBeUndefined();

    if (typeof document !== "undefined") {
      const snackbarText = document.querySelector(".snackbar")?.textContent?.trim() ?? "";
      expect(snackbarText).toMatch(/Next round in: \d+s/);
    }

    if (typeof window !== "undefined") {
      const resolveEvents = window.__promiseEvents?.filter(
        (event) =>
          event?.type === "promise-resolve" &&
          (event.key === "countdownStartedPromise" || event.key === "roundTimeoutPromise")
      );
      expect(resolveEvents?.length).toBeGreaterThanOrEqual(2);
      expect(window.countdownStartedPromise).not.toBe(initialCountdownRef);
      expect(window.roundTimeoutPromise).not.toBe(initialTimeoutRef);
    }
  });
});
