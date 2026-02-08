import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const DISPATCH_PATCHED_KEY = "__classicBattleDispatchPatched";
const DISPATCH_ORIGINAL_KEY = "__classicBattleDispatchOriginal";
const DISPATCH_WRAPPED_KEY = "__classicBattleDispatchWrapped";

const originalDispatchDescriptor = Object.getOwnPropertyDescriptor(globalThis, "dispatchEvent");

function restoreDispatchEvent() {
  if (originalDispatchDescriptor) {
    Object.defineProperty(globalThis, "dispatchEvent", originalDispatchDescriptor);
  } else {
    delete globalThis.dispatchEvent;
  }
}

function clearInstrumentationState() {
  delete globalThis[DISPATCH_PATCHED_KEY];
  delete globalThis[DISPATCH_ORIGINAL_KEY];
  delete globalThis[DISPATCH_WRAPPED_KEY];
}

describe("battleEvents test debug instrumentation", () => {
  beforeEach(async () => {
    await vi.resetModules();
    restoreDispatchEvent();
    clearInstrumentationState();
  });

  afterEach(async () => {
    await vi.resetModules();
    restoreDispatchEvent();
    clearInstrumentationState();
  });

  it("patches globalThis.dispatchEvent only once across repeated module imports", async () => {
    const dispatchSpy = vi.fn(() => true);
    globalThis.dispatchEvent = dispatchSpy;

    await import("../../../src/helpers/classicBattle/battleEvents.js");

    const firstWrapper = globalThis.dispatchEvent;
    const firstOriginal = globalThis[DISPATCH_ORIGINAL_KEY];

    await vi.resetModules();
    await import("../../../src/helpers/classicBattle/battleEvents.js");

    expect(globalThis[DISPATCH_PATCHED_KEY]).toBe(true);
    expect(globalThis.dispatchEvent).toBe(firstWrapper);
    expect(globalThis[DISPATCH_WRAPPED_KEY]).toBe(firstWrapper);
    expect(globalThis[DISPATCH_ORIGINAL_KEY]).toBe(firstOriginal);

    const event = new Event("instrumentation-once");
    globalThis.dispatchEvent(event);

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith(event);
  });

  it("does not throw when dispatchEvent is unavailable", async () => {
    delete globalThis.dispatchEvent;

    await expect(
      import("../../../src/helpers/classicBattle/battleEvents.js")
    ).resolves.toBeDefined();

    expect(globalThis[DISPATCH_PATCHED_KEY]).toBeUndefined();
    expect(globalThis[DISPATCH_ORIGINAL_KEY]).toBeUndefined();
    expect(globalThis[DISPATCH_WRAPPED_KEY]).toBeUndefined();
  });
});
