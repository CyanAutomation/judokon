import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../src/helpers/classicBattle/eventDispatcher.js", () => {
  const dispatchBattleEvent = vi.fn(() => true);
  return {
    dispatchBattleEvent,
    resetDispatchHistory: vi.fn()
  };
});

vi.mock("../../../../src/helpers/classicBattle/debugHooks.js", () => ({
  readDebugState: vi.fn(() => undefined)
}));

import {
  createExpirationTelemetryEmitter,
  createMachineReader,
  createMachineStateInspector,
  dispatchReadyDirectly,
  dispatchReadyViaBus,
  dispatchReadyWithOptions,
  runReadyDispatchStrategies,
  updateExpirationUi
} from "../../../../src/helpers/classicBattle/nextRound/expirationHandlers.js";
import { dispatchBattleEvent } from "../../../../src/helpers/classicBattle/eventDispatcher.js";

const getMockedDispatch = () => {
  const mock = /** @type {ReturnType<typeof vi.fn>} */ (dispatchBattleEvent);
  if (!mock?.mock) {
    throw new Error("dispatchBattleEvent is not properly mocked");
  }
  return mock;
};

describe("createExpirationTelemetryEmitter", () => {
  it("emits to all targets and stores values in debug bag", () => {
    const expose = vi.fn();
    const debugExpose = vi.fn();
    const bag = {};
    const { emit, getDebugBag } = createExpirationTelemetryEmitter({
      exposeDebugState: expose,
      debugExpose,
      getDebugBag: () => bag
    });
    emit("testKey", { value: 42 });
    expect(expose).toHaveBeenCalledWith("testKey", { value: 42 });
    expect(debugExpose).toHaveBeenCalledWith("testKey", { value: 42 });
    expect(bag.testKey).toEqual({ value: 42 });
    expect(getDebugBag()).toBe(bag);
  });
});

describe("createMachineReader", () => {
  it("prefers override getter and reports telemetry", () => {
    const emit = vi.fn();
    const machine = { state: "cooldown" };
    const reader = createMachineReader(
      { getClassicBattleMachine: () => machine },
      { emitTelemetry: emit }
    );
    expect(reader()).toBe(machine);
    expect(emit).toHaveBeenCalledWith("handleNextRoundMachineGetterOverride", machine);
  });

  it("falls back to debug state getter", () => {
    const emit = vi.fn();
    const getter = vi.fn(() => ({ state: "roundOver" }));
    const reader = createMachineReader(
      {},
      {
        emitTelemetry: emit,
        readDebugState: vi.fn(() => getter)
      }
    );
    expect(reader()).toEqual({ state: "roundOver" });
    expect(getter).toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith("handleNextRoundMachineGetterResult", { state: "roundOver" });
  });
});

describe("createMachineStateInspector", () => {
  it("resolves immediately when machine already cooled down", async () => {
    const emit = vi.fn();
    const machineReader = () => ({ getState: () => "cooldown" });
    const inspector = createMachineStateInspector({
      machineReader,
      getSnapshot: () => ({ state: "intro" }),
      getMachineState: (machine) => machine?.getState?.() ?? null,
      isCooldownState: (state) => state === "cooldown",
      emitTelemetry: emit
    });
    await inspector.waitForCooldown({
      on: vi.fn(),
      off: vi.fn()
    });
    expect(emit).toHaveBeenCalledWith("handleNextRoundMachineStateAfterWait", "cooldown");
  });

  it("waits for bus notification when not yet ready", async () => {
    const emit = vi.fn();
    let state = "intro";
    const machineReader = () => ({ getState: () => state });
    const handlers = new Set();
    const inspector = createMachineStateInspector({
      machineReader,
      getSnapshot: () => ({ state }),
      getMachineState: (machine) => machine?.getState?.() ?? null,
      isCooldownState: (value) => value === "cooldown",
      emitTelemetry: emit
    });
    const bus = {
      on: vi.fn((event, handler) => {
        if (event === "battleStateChange") handlers.add(handler);
      }),
      off: vi.fn((event, handler) => {
        if (event === "battleStateChange") handlers.delete(handler);
      })
    };
    const waitPromise = inspector.waitForCooldown(bus);
    state = "cooldown";
    handlers.forEach((handler) => handler());
    await waitPromise;
    expect(bus.off).toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith("handleNextRoundMachineStateAfterWait", "cooldown");
  });

  it("records telemetry when machine read fails", () => {
    const emit = vi.fn();
    const inspector = createMachineStateInspector({
      machineReader: () => {
        throw new Error("no machine");
      },
      getSnapshot: () => null,
      getMachineState: () => {
        throw new Error("boom");
      },
      isCooldownState: () => false,
      emitTelemetry: emit
    });
    inspector.shouldResolve();
    expect(emit).toHaveBeenCalledWith("handleNextRoundMachineReadError", true);
  });
});

describe("dispatchReadyWithOptions", () => {
  it("returns true when dispatcher resolves truthy", async () => {
    const emit = vi.fn();
    const bag = {};
    const result = await dispatchReadyWithOptions({
      dispatchBattleEvent: vi.fn(() => "ok"),
      emitTelemetry: emit,
      getDebugBag: () => bag
    });
    expect(result).toBe(true);
    expect(emit).toHaveBeenCalledWith("handleNextRound_dispatchViaOptions_result", true);
    expect(bag.handleNextRound_dispatchViaOptions_result).toEqual({ dispatched: true });
  });

  it("returns false when dispatcher rejects", async () => {
    const emit = vi.fn();
    const error = new Error("nope");
    const result = await dispatchReadyWithOptions({
      dispatchBattleEvent: vi.fn(() => {
        throw error;
      }),
      emitTelemetry: emit,
      getDebugBag: () => ({})
    });
    expect(result).toBe(false);
    expect(emit).toHaveBeenCalledWith("handleNextRound_dispatchViaOptions_error", {
      message: error.message
    });
  });
});

describe("dispatchReadyViaBus", () => {
  it("uses injected dispatcher when provided", async () => {
    const dispatcher = vi.fn(() => true);
    const result = await dispatchReadyViaBus({ dispatchBattleEvent: dispatcher });
    expect(result).toBe(true);
    expect(dispatcher).toHaveBeenCalledWith("ready");
  });

  it("falls back to global dispatcher when override missing", async () => {
    const mocked = getMockedDispatch();
    mocked.mockReturnValueOnce(true);
    const result = await dispatchReadyViaBus();
    expect(result).toBe(true);
    expect(mocked).toHaveBeenCalledWith("ready");
  });
});

describe("dispatchReadyDirectly", () => {
  it("invokes machine dispatch when available", async () => {
    const emit = vi.fn();
    const dispatch = vi.fn(() => "done");
    const result = await dispatchReadyDirectly({
      machineReader: () => ({ dispatch }),
      emitTelemetry: emit
    });
    expect(result).toBe(true);
    expect(dispatch).toHaveBeenCalledWith("ready");
    expect(emit).toHaveBeenCalledWith("handleNextRound_dispatchReadyDirectly_result", true);
  });

  it("returns false when dispatch missing", async () => {
    const emit = vi.fn();
    const result = await dispatchReadyDirectly({ machineReader: () => ({}), emitTelemetry: emit });
    expect(result).toBe(false);
    expect(emit).toHaveBeenCalledWith("handleNextRound_dispatchReadyDirectly_info", {
      machineExists: true,
      hasDispatch: false
    });
  });
});

describe("runReadyDispatchStrategies", () => {
  it("short-circuits once a strategy succeeds", async () => {
    const emit = vi.fn();
    const result = await runReadyDispatchStrategies({
      strategies: [
        () => false,
        () => true,
        () => {
          throw new Error("should not run");
        }
      ],
      emitTelemetry: emit
    });
    expect(result).toBe(true);
    expect(emit).toHaveBeenCalledWith("handleNextRoundDispatchResult", true);
  });

  it("reports failure when all strategies fail", async () => {
    const emit = vi.fn();
    const result = await runReadyDispatchStrategies({
      strategies: [() => false, () => false],
      emitTelemetry: emit
    });
    expect(result).toBe(false);
    expect(emit).toHaveBeenCalledWith("handleNextRoundDispatchResult", false);
  });
});

describe("updateExpirationUi", () => {
  it("marks DOM when orchestration inactive", async () => {
    const markReady = vi.fn();
    const button = { id: "btn" };
    const documentRef = { getElementById: vi.fn(() => button) };
    await updateExpirationUi({
      isOrchestrated: () => false,
      markReady,
      button,
      documentRef
    });
    expect(markReady).toHaveBeenCalledWith(button);
  });

  it("skips DOM updates when orchestrated and still updates debug panel", async () => {
    const markReady = vi.fn();
    const updatePanel = vi.fn();
    await updateExpirationUi({
      isOrchestrated: () => true,
      markReady,
      button: null,
      documentRef: null,
      updateDebugPanel: updatePanel
    });
    expect(markReady).not.toHaveBeenCalled();
    expect(updatePanel).toHaveBeenCalled();
  });
});
