import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";

let timestamp = 0;
let minDuration = 0;
let opponentDelayMs = 0;
let timersControl = null;
const eventHandlers = new Map();

const trackerMock = {
  getOpponentPromptTimestamp: vi.fn(() => timestamp),
  getOpponentPromptMinDuration: vi.fn(() => minDuration)
};
const snackbarMock = {
  getOpponentDelay: vi.fn(() => opponentDelayMs)
};

vi.mock("../../../src/helpers/classicBattle/opponentPromptTracker.js", () => trackerMock);
vi.mock("../../../src/helpers/classicBattle/snackbar.js", () => snackbarMock);
const onBattleEventMock = vi.fn((eventName, handler) => {
  if (!eventHandlers.has(eventName)) {
    eventHandlers.set(eventName, new Set());
  }
  eventHandlers.get(eventName).add(handler);
});
const offBattleEventMock = vi.fn((eventName, handler) => {
  const set = eventHandlers.get(eventName);
  set?.delete(handler);
});
vi.mock("../../../src/helpers/classicBattle/battleEvents.js", () => ({
  onBattleEvent: onBattleEventMock,
  offBattleEvent: offBattleEventMock
}));

function emitEvent(type, detail) {
  const handlers = Array.from(eventHandlers.get(type) || []);
  handlers.forEach((handler) => {
    try {
      handler({ type, detail });
    } catch {}
  });
}

describe("waitForDelayedOpponentPromptDisplay", () => {
  beforeEach(() => {
    timestamp = 0;
    minDuration = 0;
    opponentDelayMs = 0;
    trackerMock.getOpponentPromptTimestamp.mockClear();
    trackerMock.getOpponentPromptMinDuration.mockClear();
    snackbarMock.getOpponentDelay.mockClear();
    eventHandlers.clear();
    onBattleEventMock.mockClear();
    offBattleEventMock.mockClear();
    timersControl = useCanonicalTimers();
  });

  afterEach(() => {
    timersControl?.cleanup();
    timersControl = null;
  });

  it("resolves once a prompt-ready event fires within the budget", async () => {
    const { waitForDelayedOpponentPromptDisplay, computeOpponentPromptWaitBudget } = await import(
      "../../../src/helpers/classicBattle/opponentPromptWaiter.js"
    );
    const budget = computeOpponentPromptWaitBudget(120);
    const waiterPromise = waitForDelayedOpponentPromptDisplay(budget, { intervalMs: 60 });
    await Promise.resolve();
    const handlers = Array.from(eventHandlers.get("opponentPromptReady") || []);
    expect(handlers.length).toBeGreaterThan(0);
    timestamp = 42;
    emitEvent("opponentPromptReady", { timestamp });
    await waiterPromise;
    expect(trackerMock.getOpponentPromptTimestamp.mock.calls.length).toBeGreaterThan(1);
    handlers.forEach((handler) => {
      expect(offBattleEventMock).toHaveBeenCalledWith("opponentPromptReady", handler);
    });
  });

  it("resolves after the full budget when the timestamp never appears", async () => {
    const { waitForDelayedOpponentPromptDisplay, computeOpponentPromptWaitBudget } = await import(
      "../../../src/helpers/classicBattle/opponentPromptWaiter.js"
    );
    const budget = computeOpponentPromptWaitBudget(150);
    const waiterPromise = waitForDelayedOpponentPromptDisplay(budget, { intervalMs: 70 });
    await timersControl.advanceTimersByTimeAsync(budget.totalMs + 10);
    await waiterPromise;
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
    const waiterPromise = waitForDelayedOpponentPromptDisplay({ totalMs: 40 }, { intervalMs: 20 });
    await timersControl.advanceTimersByTimeAsync(45);
    await waiterPromise;
    expect(eventHandlers.get("opponentPromptReady")?.size ?? 0).toBe(0);
    emitEvent("opponentPromptReady", { timestamp: 99 });
    expect(eventHandlers.get("opponentPromptReady")?.size ?? 0).toBe(0);
  });

  it("uses an injected scheduler when provided", async () => {
    const scheduler = {
      setTimeout: vi.fn((handler, delay) => setTimeout(handler, delay))
    };
    const { waitForDelayedOpponentPromptDisplay, computeOpponentPromptWaitBudget } = await import(
      "../../../src/helpers/classicBattle/opponentPromptWaiter.js"
    );
    const budget = computeOpponentPromptWaitBudget(80);
    const waiterPromise = waitForDelayedOpponentPromptDisplay(budget, {
      intervalMs: 40,
      scheduler
    });
    await Promise.resolve();
    expect(scheduler.setTimeout).toHaveBeenCalled();
    timestamp = 123;
    await timersControl.advanceTimersByTimeAsync(45);
    await waiterPromise;
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
