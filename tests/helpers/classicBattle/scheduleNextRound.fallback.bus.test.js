import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSimpleHarness } from "../integrationHarness.js";
import { resetDispatchHistory } from "/src/helpers/classicBattle/eventDispatcher.js";

const READY_EVENT = "ready";

/**
 * Shared mock state for all test suites.
 * Uses vi.hoisted() to ensure these are created before module imports.
 */
const mockState = vi.hoisted(() => ({
  dispatchSpy: null,
}));

// Mock event dispatcher (specifier 1: alias)
const dispatcherMockRef = vi.hoisted(() => vi.fn(() => true));
vi.mock("/src/helpers/classicBattle/eventDispatcher.js", () => ({
  dispatchBattleEvent: dispatcherMockRef,
  resetDispatchHistory: vi.fn(),
}));

describe("bus propagation and deduplication", () => {
  let harness;
  let machine;

  beforeEach(async () => {
    machine = { dispatch: vi.fn() };
    machine.state = { value: "idle" };
    mockState.dispatchSpy = dispatcherMockRef;
    mockState.dispatchSpy.mockReturnValue(true);

    harness = createSimpleHarness();
    await harness.setup();
  });

  afterEach(() => {
    harness.cleanup();
    mockState.dispatchSpy = null;
  });

  it("skips bus propagation when dedupe tracking handles readiness in orchestrated mode", async () => {
    const expirationHandlersModule = await harness.importModule(
      "../../../src/helpers/classicBattle/nextRound/expirationHandlers.js"
    );
    const dispatchReadyViaBusSpy = vi.spyOn(
      expirationHandlersModule,
      "dispatchReadyViaBus"
    );

    mockState.dispatchSpy.mockClear();
    const directResult = await expirationHandlersModule.dispatchReadyDirectly({
      machineReader: () => machine,
    });
    const busResult = await expirationHandlersModule.dispatchReadyViaBus({
      dispatchBattleEvent: mockState.dispatchSpy,
      alreadyDispatched: directResult.dispatched && directResult.dedupeTracked,
    });
    expect(busResult).toBe(true);
    expect(dispatchReadyViaBusSpy).toHaveBeenCalledTimes(1);
    expect(dispatchReadyViaBusSpy).toHaveBeenCalledWith(
      expect.objectContaining({ alreadyDispatched: true })
    );
    expect(mockState.dispatchSpy).toHaveBeenCalledTimes(1);
    expect(mockState.dispatchSpy).toHaveBeenCalledWith("ready");
    expect(directResult).toEqual({ dispatched: true, dedupeTracked: true });
  });

  it("invokes the bus dispatcher after machine-only readiness dispatch", async () => {
    const expirationHandlersModule = await harness.importModule(
      "../../../src/helpers/classicBattle/nextRound/expirationHandlers.js"
    );
    const dispatchReadyViaBusSpy = vi.spyOn(
      expirationHandlersModule,
      "dispatchReadyViaBus"
    );

    mockState.dispatchSpy.mockClear();
    mockState.dispatchSpy.mockImplementationOnce(() => false);
    mockState.dispatchSpy.mockImplementation(() => true);

    const directResult = await expirationHandlersModule.dispatchReadyDirectly({
      machineReader: () => machine,
    });
    const busResult = await expirationHandlersModule.dispatchReadyViaBus({
      dispatchBattleEvent: mockState.dispatchSpy,
      alreadyDispatched: directResult.dispatched && directResult.dedupeTracked,
    });
    expect(busResult).toBe(true);
    expect(mockState.dispatchSpy).toHaveBeenCalledTimes(2);
    expect(mockState.dispatchSpy).toHaveBeenNthCalledWith(1, READY_EVENT);
    expect(mockState.dispatchSpy).toHaveBeenNthCalledWith(2, READY_EVENT);
    expect(dispatchReadyViaBusSpy).toHaveBeenCalledTimes(1);
    expect(dispatchReadyViaBusSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        dispatchBattleEvent: mockState.dispatchSpy,
        alreadyDispatched: false,
      })
    );
    expect(directResult).toEqual({ dispatched: true, dedupeTracked: false });
  });
});
