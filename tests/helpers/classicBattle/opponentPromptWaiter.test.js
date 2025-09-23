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
    vi.resetModules();
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
});
