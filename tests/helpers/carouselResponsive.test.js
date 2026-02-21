import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { setupResponsiveSizing } from "../../src/helpers/carousel/responsive.js";

describe("setupResponsiveSizing", () => {
  let originalResizeObserver;
  let observeSpy;
  let disconnectSpy;

  beforeEach(() => {
    observeSpy = vi.fn();
    disconnectSpy = vi.fn();
    originalResizeObserver = globalThis.ResizeObserver;
    globalThis.ResizeObserver = vi.fn(function ResizeObserverMock(callback) {
      this.callback = callback;
      this.observe = observeSpy;
      this.disconnect = disconnectSpy;
    });
  });

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver;
    vi.restoreAllMocks();
  });

  it("registers resize listener and observer only once per container", () => {
    const container = document.createElement("div");
    container.innerHTML = '<div class="judoka-card"></div>';
    const addListenerSpy = vi.spyOn(window, "addEventListener");

    const disposeFirst = setupResponsiveSizing(container);
    const disposeSecond = setupResponsiveSizing(container);

    expect(globalThis.ResizeObserver).toHaveBeenCalledTimes(1);
    expect(observeSpy).toHaveBeenCalledTimes(1);
    expect(observeSpy).toHaveBeenCalledWith(container);
    expect(addListenerSpy).toHaveBeenCalledTimes(1);
    expect(addListenerSpy).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(disposeFirst).toBe(disposeSecond);
  });

  it("disposer disconnects observer and removes resize listener", () => {
    const container = document.createElement("div");
    container.innerHTML = '<div class="judoka-card"></div>';
    const removeListenerSpy = vi.spyOn(window, "removeEventListener");

    const dispose = setupResponsiveSizing(container);
    dispose();

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
    expect(removeListenerSpy).toHaveBeenCalledTimes(1);
    expect(removeListenerSpy).toHaveBeenCalledWith("resize", expect.any(Function));

    dispose();
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
    expect(removeListenerSpy).toHaveBeenCalledTimes(1);
  });

  it("repeated setup and dispose does not leak handlers", () => {
    const container = document.createElement("div");
    container.innerHTML = '<div class="judoka-card"></div>';
    const addListenerSpy = vi.spyOn(window, "addEventListener");
    const removeListenerSpy = vi.spyOn(window, "removeEventListener");

    for (let i = 0; i < 3; i += 1) {
      const dispose = setupResponsiveSizing(container);
      dispose();
    }

    expect(globalThis.ResizeObserver).toHaveBeenCalledTimes(3);
    expect(observeSpy).toHaveBeenCalledTimes(3);
    expect(disconnectSpy).toHaveBeenCalledTimes(3);
    expect(addListenerSpy).toHaveBeenCalledTimes(3);
    expect(removeListenerSpy).toHaveBeenCalledTimes(3);
  });
});
