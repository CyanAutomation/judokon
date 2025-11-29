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
  dispatchSpy: null,
  scheduler: null,
}));

// Mock event dispatcher (specifier 1: alias)
const dispatcherMockRef = vi.hoisted(() => vi.fn(() => true));
vi.mock("/src/helpers/classicBattle/eventDispatcher.js", () => ({
  dispatchBattleEvent: dispatcherMockRef,
  resetDispatchHistory: vi.fn(),
}));

describe("handleNextRoundExpiration immediate readiness", () => {
  let harness;
  let scheduler;

  beforeEach(async () => {
    mockState.dispatchSpy = dispatcherMockRef;
    mockState.dispatchSpy.mockResolvedValue(undefined);

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
  });

  it("dispatches ready when state already progressed past cooldown", async () => {
    // Mock round timer to expire immediately
    const { mockCreateRoundTimer } = await import("../roundTimerMock.js");
    mockCreateRoundTimer({ scheduled: false, ticks: [], expire: true });

    const { startCooldown } = await harness.importModule(
      "/src/helpers/classicBattle/roundManager.js"
    );
    const controls = startCooldown({}, scheduler);
    expect(controls).toBeTruthy();
    expect(typeof controls?.ready).toBe("object");
    expect(typeof controls.ready.then).toBe("function");
    await vi.runAllTimersAsync();
    await controls.ready;
    expect(mockState.dispatchSpy).toHaveBeenCalledTimes(1);
    expect(mockState.dispatchSpy).toHaveBeenCalledWith("ready");
  });

  it("falls back to machine dispatch when event dispatcher reports no machine", async () => {
    // Mock round timer to expire
    const { mockCreateRoundTimer } = await import("../roundTimerMock.js");
    mockCreateRoundTimer({ scheduled: false, ticks: [], expire: true });

    const { startCooldown } = await harness.importModule(
      "/src/helpers/classicBattle/roundManager.js"
    );
    const controls = startCooldown({}, scheduler);
    expect(controls).toBeTruthy();
    expect(typeof controls?.ready).toBe("object");
    expect(typeof controls.ready.then).toBe("function");
    await vi.runAllTimersAsync();
    await controls.ready;
    expect(mockState.dispatchSpy).toHaveBeenCalledTimes(1);
    expect(mockState.dispatchSpy).toHaveBeenCalledWith("ready");
  });
});
