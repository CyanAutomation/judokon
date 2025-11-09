import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createManualTimingControls } from "../../utils/manualTimingControls.js";

describe("waitForDelayedOpponentPromptDisplay", () => {
  let timestamp = 0;
  let minDuration = 0;
  let opponentDelayMs = 0;
  let eventHandlers = new Map();
  let trackerMock;
  let snackbarMock;
  let onBattleEventMock;
  let offBattleEventMock;

  function emitEvent(type, detail) {
    const handlers = Array.from(eventHandlers.get(type) || []);
    handlers.forEach((handler) => {
      try {
        handler({ type, detail });
      } catch {}
    });
  }

  beforeEach(async () => {
    // Reset modules to ensure fresh imports with proper mocks
    vi.resetModules();
    
    // Re-initialize state
    timestamp = 0;
    minDuration = 0;
    opponentDelayMs = 0;
    eventHandlers = new Map();

    // Set up mocks
    trackerMock = {
      getOpponentPromptTimestamp: vi.fn(() => timestamp),
      getOpponentPromptMinDuration: vi.fn(() => minDuration)
    };
    snackbarMock = {
      getOpponentDelay: vi.fn(() => opponentDelayMs)
    };

    onBattleEventMock = vi.fn((eventName, handler) => {
      if (!eventHandlers.has(eventName)) {
        eventHandlers.set(eventName, new Set());
      }
      eventHandlers.get(eventName).add(handler);
    });
    offBattleEventMock = vi.fn((eventName, handler) => {
      const set = eventHandlers.get(eventName);
      set?.delete(handler);
    });

    // Use vi.doMock to set up mocks dynamically
    vi.doMock("../../../src/helpers/classicBattle/opponentPromptTracker.js", () => trackerMock);
    vi.doMock("../../../src/helpers/classicBattle/snackbar.js", () => snackbarMock);
    vi.doMock("../../../src/helpers/classicBattle/battleEvents.js", () => ({
      onBattleEvent: onBattleEventMock,
      offBattleEvent: offBattleEventMock
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("resolves once a prompt-ready event fires within the budget", async () => {
    const { waitForDelayedOpponentPromptDisplay, computeOpponentPromptWaitBudget } = await import(
      "../../../src/helpers/classicBattle/opponentPromptWaiter.js"
    );
    const timing = createManualTimingControls();
    const restoreTime = timing.mockTime();
    let handlers = [];
    try {
      const budget = computeOpponentPromptWaitBudget(120);
      const waiterPromise = waitForDelayedOpponentPromptDisplay(budget, {
        intervalMs: 60,
        scheduler: timing.scheduler
      });
      await timing.runNext();
      handlers = Array.from(eventHandlers.get("opponentPromptReady") || []);
      expect(handlers.length).toBeGreaterThan(0);
      timestamp = 42;
      emitEvent("opponentPromptReady", { timestamp });
      await waiterPromise;
    } finally {
      restoreTime();
    }
    expect(trackerMock.getOpponentPromptTimestamp.mock.calls.length).toBeGreaterThan(1);
    handlers.forEach((handler) => {
      expect(offBattleEventMock).toHaveBeenCalledWith("opponentPromptReady", handler);
    });
  });

  it("resolves after the full budget when the timestamp never appears", async () => {
    const { waitForDelayedOpponentPromptDisplay, computeOpponentPromptWaitBudget } = await import(
      "../../../src/helpers/classicBattle/opponentPromptWaiter.js"
    );
    const timing = createManualTimingControls();
    const restoreTime = timing.mockTime();
    try {
      const budget = computeOpponentPromptWaitBudget(150);
      const waiterPromise = waitForDelayedOpponentPromptDisplay(budget, {
        intervalMs: 70,
        scheduler: timing.scheduler
      });
      await timing.runUntilResolved(waiterPromise);
    } finally {
      restoreTime();
    }
    expect(trackerMock.getOpponentPromptTimestamp.mock.calls.length).toBeGreaterThan(0);
    expect(eventHandlers.get("opponentPromptReady")?.size ?? 0).toBe(0);
  });

  it("rejects when provided an invalid interval override", async () => {
    const { waitForDelayedOpponentPromptDisplay } = await import(
      "../../../src/helpers/classicBattle/opponentPromptWaiter.js"
    );
    await expect(
      waitForDelayedOpponentPromptDisplay({ totalMs: 100 }, { intervalMs: 0 })
    ).rejects.toThrow(/intervalMs must be a positive number/);
  });

  it("short-circuits when the wait budget is invalid", async () => {
    const { waitForDelayedOpponentPromptDisplay } = await import(
      "../../../src/helpers/classicBattle/opponentPromptWaiter.js"
    );
    await waitForDelayedOpponentPromptDisplay({ totalMs: Number.NaN });
    expect(onBattleEventMock).not.toHaveBeenCalled();
    expect(eventHandlers.get("opponentPromptReady")?.size ?? 0).toBe(0);
  });

  it("cleans up handlers even when the timeout path resolves first", async () => {
    const { waitForDelayedOpponentPromptDisplay } = await import(
      "../../../src/helpers/classicBattle/opponentPromptWaiter.js"
    );
    const timing = createManualTimingControls();
    const restoreTime = timing.mockTime();
    try {
      const waiterPromise = waitForDelayedOpponentPromptDisplay(
        { totalMs: 40 },
        { intervalMs: 20, scheduler: timing.scheduler }
      );
      await timing.runUntilResolved(waiterPromise);
    } finally {
      restoreTime();
    }
    expect(eventHandlers.get("opponentPromptReady")?.size ?? 0).toBe(0);
    emitEvent("opponentPromptReady", { timestamp: 99 });
    expect(eventHandlers.get("opponentPromptReady")?.size ?? 0).toBe(0);
  });

  it("uses an injected scheduler when provided", async () => {
    const { waitForDelayedOpponentPromptDisplay, computeOpponentPromptWaitBudget } = await import(
      "../../../src/helpers/classicBattle/opponentPromptWaiter.js"
    );
    const timing = createManualTimingControls();
    const restoreTime = timing.mockTime();
    try {
      const budget = computeOpponentPromptWaitBudget(80);
      const waiterPromise = waitForDelayedOpponentPromptDisplay(budget, {
        intervalMs: 40,
        scheduler: timing.scheduler
      });
      expect(timing.scheduler.setTimeout).toHaveBeenCalled();
      timestamp = 123;
      await timing.runNext();
      await waiterPromise;
    } finally {
      restoreTime();
    }
  });

  it("falls back gracefully when prompt-ready subscription registration fails", async () => {
    const failingOptions = {
      onEvent: vi.fn(() => {
        throw new Error("register failure");
      }),
      offEvent: vi.fn()
    };
    const { waitForDelayedOpponentPromptDisplay } = await import(
      "../../../src/helpers/classicBattle/opponentPromptWaiter.js"
    );
    await waitForDelayedOpponentPromptDisplay({ totalMs: 120 }, failingOptions);
    expect(failingOptions.onEvent).toHaveBeenCalled();
    expect(failingOptions.offEvent).not.toHaveBeenCalled();
  });
});

describe("createPollingThrottle", () => {
  it("resolves asynchronously when timers are unavailable", async () => {
    const { createPollingThrottle } = await import(
      "../../../src/helpers/classicBattle/pollingThrottle.js"
    );
    const originalSetTimeout = globalThis.setTimeout;
    const failingScheduler = {
      setTimeout: () => {
        throw new Error("scheduler disabled");
      }
    };
    globalThis.setTimeout = undefined;
    try {
      const throttle = createPollingThrottle({ scheduler: failingScheduler });
      let resolved = false;
      const waitPromise = throttle.wait(10).then((usedTimer) => {
        resolved = true;
        expect(usedTimer).toBe(false);
      });
      expect(resolved).toBe(false);
      await waitPromise;
      expect(resolved).toBe(true);
    } finally {
      globalThis.setTimeout = originalSetTimeout;
    }
  });
});
