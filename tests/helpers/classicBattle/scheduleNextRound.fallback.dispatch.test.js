import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTimerNodes } from "./domUtils.js";
import { createMockScheduler } from "../mockScheduler.js";
import { createSimpleHarness } from "../integrationHarness.js";
import { resetDispatchHistory } from "/src/helpers/classicBattle/eventDispatcher.js";

/**
 * Shared mock state for all test suites.
 * Uses vi.hoisted() to ensure these are created before module imports.
 */
const mockState = vi.hoisted(() => ({
  dispatchSpy: null,
  scheduler: null,
  nextRoundCooldown: 0
}));

// Mock event dispatcher (specifier 1: alias)
const dispatcherMockRef = vi.hoisted(() => vi.fn(() => true));
vi.mock("/src/helpers/classicBattle/eventDispatcher.js", () => ({
  dispatchBattleEvent: dispatcherMockRef,
  resetDispatchHistory: vi.fn()
}));

// Mock computeNextRoundCooldown
vi.mock("../../../src/helpers/timers/computeNextRoundCooldown.js", () => ({
  computeNextRoundCooldown: () => mockState.nextRoundCooldown
}));

// Mock debugHooks
vi.mock("../../../src/helpers/classicBattle/debugHooks.js", () => {
  const mock = {
    readDebugState: vi.fn(() => null),
    exposeDebugState: vi.fn()
  };
  return { ...mock, default: mock };
});

describe("startCooldown ready dispatch discipline", () => {
  let harness;
  let scheduler;

  beforeEach(async () => {
    mockState.dispatchSpy = dispatcherMockRef;
    mockState.nextRoundCooldown = 1;

    harness = createSimpleHarness();
    await harness.setup();

    scheduler = createMockScheduler();
    mockState.scheduler = scheduler;
    document.body.innerHTML = "";
    createTimerNodes();

    resetDispatchHistory();
  });

  afterEach(() => {
    harness.cleanup();
    mockState.dispatchSpy = null;
    mockState.nextRoundCooldown = 0;
  });

  it("dispatches ready exactly once when round timer expires", async () => {
    // Mock round timer to expire
    const { mockCreateRoundTimer } = await import("../roundTimerMock.js");
    mockCreateRoundTimer({ scheduled: false, ticks: [], expire: true });

    const { startCooldown } = await harness.importModule(
      "/src/helpers/classicBattle/roundManager.js"
    );
    const controls = startCooldown({}, scheduler);
    scheduler.tick(0);
    await controls.ready;
    expect(mockState.dispatchSpy).toHaveBeenCalledTimes(1);
    expect(mockState.dispatchSpy).toHaveBeenCalledWith("ready");
  });

  it("dispatches ready exactly once when fallback timer fires", async () => {
    // Mock round timer to not expire
    const { mockCreateRoundTimer } = await import("../roundTimerMock.js");
    mockCreateRoundTimer({ scheduled: false, ticks: [], expire: false });

    const { startCooldown } = await harness.importModule(
      "/src/helpers/classicBattle/roundManager.js"
    );
    const controls = startCooldown({}, scheduler);
    scheduler.tick(0);
    scheduler.tick(20);
    expect(mockState.dispatchSpy).not.toHaveBeenCalled();
    scheduler.tick(1000);
    scheduler.tick(1000);
    await vi.runAllTimersAsync();
    await controls.ready;
    expect(mockState.dispatchSpy).toHaveBeenCalledTimes(1);
    expect(mockState.dispatchSpy).toHaveBeenCalledWith("ready");
    await vi.runAllTimersAsync();
    expect(mockState.dispatchSpy).toHaveBeenCalledTimes(1);
  });
});
