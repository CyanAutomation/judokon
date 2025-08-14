import { describe, it, expect, vi } from "vitest";

if (typeof TouchEvent === "undefined") {
  globalThis.TouchEvent = class extends Event {
    constructor(type, opts = {}) {
      super(type, opts);
      this.touches = opts.touches || [];
      this.changedTouches = opts.changedTouches || [];
    }
  };
}

if (typeof PointerEvent === "undefined") {
  globalThis.PointerEvent = class extends MouseEvent {
    constructor(type, params = {}) {
      super(type, params);
      this.pointerType = params.pointerType ?? "";
    }
  };
}

vi.mock("../../src/helpers/carousel/metrics.js", () => ({
  getPageMetrics: () => ({ gap: 0, pageWidth: 100, cardsPerPage: 1, pageCount: 3 })
}));

import { CarouselController } from "../../src/helpers/carousel/controller.js";

describe("CarouselController", () => {
  it("removes input listeners on destroy", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const container = document.createElement("div");
    container.scrollTo = vi.fn();
    const wrapper = document.createElement("div");

    const controller = new CarouselController(container, wrapper);
    const prevSpy = vi.spyOn(controller, "prev");
    const nextSpy = vi.spyOn(controller, "next");

    container.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    container.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
    container.dispatchEvent(new TouchEvent("touchstart", { touches: [{ clientX: 0 }] }));
    container.dispatchEvent(new TouchEvent("touchend", { changedTouches: [{ clientX: -100 }] }));
    container.dispatchEvent(new PointerEvent("pointerdown", { clientX: 0 }));
    container.dispatchEvent(new PointerEvent("pointerup", { clientX: 100 }));

    expect(nextSpy).toHaveBeenCalledTimes(2);
    expect(prevSpy).toHaveBeenCalledTimes(2);

    nextSpy.mockClear();
    prevSpy.mockClear();

    controller.destroy();

    container.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    container.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
    container.dispatchEvent(new TouchEvent("touchstart", { touches: [{ clientX: 0 }] }));
    container.dispatchEvent(new TouchEvent("touchend", { changedTouches: [{ clientX: -100 }] }));
    container.dispatchEvent(new PointerEvent("pointerdown", { clientX: 0 }));
    container.dispatchEvent(new PointerEvent("pointerup", { clientX: 100 }));

    expect(nextSpy).not.toHaveBeenCalled();
    expect(prevSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
