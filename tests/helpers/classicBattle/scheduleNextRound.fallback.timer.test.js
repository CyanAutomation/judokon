import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTimerNodes } from "./domUtils.js";
import { createMockScheduler } from "../mockScheduler.js";
import { createSimpleHarness } from "../integrationHarness.js";
import { resetDispatchHistory } from "/src/helpers/classicBattle/eventDispatcher.js";

const READY_EVENT = "ready";

/**
 * Shared mock state for all test suites.
 * Uses vi.hoisted() to ensure these are created before module imports.
 */
const mockState = vi.hoisted(() => ({
  scheduler: null,
}));

// Mock event dispatcher (specifier 1: alias)
const dispatcherMockRef = vi.hoisted(() => vi.fn(() => true));
vi.mock("/src/helpers/classicBattle/eventDispatcher.js", () => ({
  dispatchBattleEvent: dispatcherMockRef,
  resetDispatchHistory: vi.fn(),
}));

// Mock battle engine facade with scheduler support
vi.mock("../../../src/helpers/battleEngineFacade.js", () => ({
  requireEngine: () => ({
    startRound: mockMakeTimer,
    startCoolDown: mockMakeTimer,
    stopTimer: vi.fn(),
    STATS: ["a", "b"],
  }),
  startRound: mockMakeTimer,
  startCoolDown: mockMakeTimer,
  stopTimer: vi.fn(),
  STATS: ["a", "b"],
}));

function mockMakeTimer(onTick, onExpired, duration) {
  onTick(duration);
  if (duration <= 0) {
    onExpired();
    return;
  }
  if (!mockState.scheduler) return;
  for (let i = 1; i <= duration; i++) {
    mockState.scheduler.setTimeout(() => {
      const remaining = duration - i;
      onTick(remaining);
      if (remaining <= 0) onExpired();
    }, i * 1000);
  }
}

// Mock debugHooks
vi.mock("../../../src/helpers/classicBattle/debugHooks.js", () => {
  const mock = {
    readDebugState: vi.fn(() => null),
    exposeDebugState: vi.fn(),
  };
  return { ...mock, default: mock };
});

// Mock debugPanel
vi.mock("../../../src/helpers/classicBattle/debugPanel.js", () => ({
  updateDebugPanel: vi.fn(),
}));

describe("startCooldown fallback timer", () => {
  let harness;

  beforeEach(async () => {
    dispatcherMockRef.mockImplementation(() => true);
    mockState.scheduler = null;

    harness = createSimpleHarness({ useFakeTimers: false });
    await harness.setup();

    mockState.scheduler = createMockScheduler();
    resetDispatchHistory();
    document.body.innerHTML = "";
    createTimerNodes();

    // Mock the round timer to not expire for fallback testing
    const { mockCreateRoundTimer } = await import("../roundTimerMock.js");
    mockCreateRoundTimer({ scheduled: false, ticks: [], expire: false });
  });

  afterEach(() => {
    harness.cleanup();
    dispatcherMockRef.mockClear();
  });

  it("resolves ready after fallback timer and enables button", async () => {
    const { startCooldown } = await harness.importModule(
      "../../../../src/helpers/classicBattle/roundManager.js"
    );
    const btn = document.querySelector('[data-role="next-round"]');
    btn.disabled = true;
    const controls = startCooldown({}, mockState.scheduler);
    let resolved = false;
    controls.ready.then(() => {
      resolved = true;
    });
    mockState.scheduler.tick(9);
    await controls.ready;
    expect(resolved).toBe(true);
    expect(btn.dataset.nextReady).toBe("true");
    mockState.scheduler.tick(1);
    expect(resolved).toBe(true);
    expect(btn.dataset.nextReady).toBe("true");
    expect(btn.disabled).toBe(false);
  });

  it("resolves ready when dispatcher reports false and enables button", async () => {
    dispatcherMockRef.mockImplementation(() => false);
    const { startCooldown } = await harness.importModule(
      "../../../../src/helpers/classicBattle/roundManager.js"
    );
    const btn = document.querySelector('[data-role="next-round"]');
    btn.disabled = true;
    const controls = startCooldown({}, mockState.scheduler);
    let resolved = false;
    controls.ready.then(() => {
      resolved = true;
    });

    mockState.scheduler.tick(9);
    await controls.ready;

    expect(resolved).toBe(true);
    expect(btn.dataset.nextReady).toBe("true");
    expect(btn.disabled).toBe(false);
  });
});
