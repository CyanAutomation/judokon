import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("createCountdownTimer visibility pause/resume", () => {
  let originalAdd;
  let originalHiddenDesc;
  let visibilityHandler = null;
  let tickCb = null;

  beforeEach(() => {
    visibilityHandler = null;
    tickCb = null;
    originalAdd = document.addEventListener;
    document.addEventListener = new Proxy(originalAdd, {
      apply(target, thisArg, args) {
        const [type, handler] = args;
        if (type === "visibilitychange" && typeof handler === "function") {
          visibilityHandler = handler;
        }
        return Reflect.apply(target, thisArg, args);
      }
    });
    // Allow redefining document.hidden for the test
    originalHiddenDesc = Object.getOwnPropertyDescriptor(Document.prototype, "hidden");
    if (!originalHiddenDesc || !originalHiddenDesc.configurable) {
      // Fallback: define on document directly
      Object.defineProperty(document, "hidden", { value: false, configurable: true });
    }
  });

  afterEach(() => {
    document.addEventListener = originalAdd;
    if (originalHiddenDesc && originalHiddenDesc.configurable) {
      Object.defineProperty(Document.prototype, "hidden", originalHiddenDesc);
    }
  });

  it("pauses when hidden and resumes on visible", async () => {
    const { createCountdownTimer } = await import("../../src/helpers/timerUtils.js");
    const onTick = vi.fn();
    const timer = createCountdownTimer(3, {
      onTick,
      pauseOnHidden: true,
      onSecondTick: (cb) => {
        tickCb = cb;
        return 1; // any id
      },
      cancel: vi.fn()
    });

    timer.start();
    expect(onTick).toHaveBeenCalledWith(3);

    // 1st tick
    await tickCb();
    expect(onTick).toHaveBeenLastCalledWith(2);

    // Simulate hide -> pause
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    visibilityHandler && visibilityHandler();
    // Next tick ignored while paused
    await tickCb();
    expect(onTick).toHaveBeenLastCalledWith(2);

    // Simulate visible -> resume
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    visibilityHandler && visibilityHandler();
    await tickCb();
    expect(onTick).toHaveBeenLastCalledWith(1);
  });
});
