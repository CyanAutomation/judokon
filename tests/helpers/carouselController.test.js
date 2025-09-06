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
  it("navigates with ArrowLeft/ArrowRight keys", () => {
    const container = document.createElement("div");
    container.scrollTo = vi.fn();
    const wrapper = document.createElement("div");
    const controller = new CarouselController(container, wrapper);
    const nextSpy = vi.spyOn(controller, "next");
    const prevSpy = vi.spyOn(controller, "prev");

    container.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    container.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));

    // Events originating from children should not trigger navigation
    const child = document.createElement("div");
    container.appendChild(child);
    child.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));

    expect(nextSpy).toHaveBeenCalledTimes(1);
    expect(prevSpy).toHaveBeenCalledTimes(1);
    controller.destroy();
  });

  it("navigates via swipe gestures with threshold", () => {
    const container = document.createElement("div");
    container.scrollTo = vi.fn();
    const wrapper = document.createElement("div");
    const controller = new CarouselController(container, wrapper);
    const nextSpy = vi.spyOn(controller, "next");
    const prevSpy = vi.spyOn(controller, "prev");

    // left swipe -> next
    container.dispatchEvent(new TouchEvent("touchstart", { touches: [{ clientX: 0 }] }));
    container.dispatchEvent(new TouchEvent("touchend", { changedTouches: [{ clientX: -100 }] }));
    // right swipe -> prev
    container.dispatchEvent(new TouchEvent("touchstart", { touches: [{ clientX: 0 }] }));
    container.dispatchEvent(new TouchEvent("touchend", { changedTouches: [{ clientX: 100 }] }));
    // small swipe should be ignored
    container.dispatchEvent(new TouchEvent("touchstart", { touches: [{ clientX: 0 }] }));
    container.dispatchEvent(new TouchEvent("touchend", { changedTouches: [{ clientX: 20 }] }));

    expect(nextSpy).toHaveBeenCalledTimes(1);
    expect(prevSpy).toHaveBeenCalledTimes(1);
    controller.destroy();
  });
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

  it("suppresses scroll sync during programmatic setPage until scrollend and keeps counter accurate", () => {
    const container = document.createElement("div");
    // emulate scrollTo behavior: set scrollLeft synchronously
    container.scrollTo = vi.fn((opts) => {
      if (typeof opts === "object") container.scrollLeft = opts.left ?? 0;
      else container.scrollLeft = opts || 0;
    });
    Object.defineProperty(container, "clientWidth", { value: 100, configurable: true });
    Object.defineProperty(container, "scrollWidth", { value: 300, configurable: true });
    container.scrollLeft = 0;
    const wrapper = document.createElement("div");

    const controller = new CarouselController(container, wrapper);
    const counter = () => wrapper.querySelector(".page-counter")?.textContent;
    expect(controller.currentPage).toBe(0);
    expect(counter()).toBe("Page 1 of 3");

    // Programmatic setPage should suppress immediate scroll events
    controller.setPage(2);
    expect(counter()).toBe("Page 3 of 3");
    // Simulate an immediate scroll event that would otherwise change page
    container.scrollLeft = 100; // would compute to page 1
    container.dispatchEvent(new Event("scroll"));
    // During suppression, currentPage should remain the programmatic target
    expect(controller.currentPage).toBe(2);
    expect(counter()).toBe("Page 3 of 3");

    // Release suppression via scrollend and then update via user scroll
    container.dispatchEvent(new Event("scrollend"));
    container.scrollLeft = 100;
    container.dispatchEvent(new Event("scroll"));
    expect(controller.currentPage).toBe(1);
    expect(counter()).toBe("Page 2 of 3");
  });

  it("resets state on cancel events", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const container = document.createElement("div");
    container.scrollTo = vi.fn();
    const wrapper = document.createElement("div");
    const controller = new CarouselController(container, wrapper);
    const prevSpy = vi.spyOn(controller, "prev");
    const nextSpy = vi.spyOn(controller, "next");

    // touchcancel should reset gesture
    container.dispatchEvent(new TouchEvent("touchstart", { touches: [{ clientX: 0 }] }));
    container.dispatchEvent(new TouchEvent("touchcancel"));
    container.dispatchEvent(new TouchEvent("touchend", { changedTouches: [{ clientX: -100 }] }));
    expect(nextSpy).not.toHaveBeenCalled();
    expect(prevSpy).not.toHaveBeenCalled();

    // after cancel, a fresh swipe should still navigate
    container.dispatchEvent(new TouchEvent("touchstart", { touches: [{ clientX: 0 }] }));
    container.dispatchEvent(new TouchEvent("touchend", { changedTouches: [{ clientX: -100 }] }));
    expect(nextSpy).toHaveBeenCalledTimes(1);

    nextSpy.mockClear();
    prevSpy.mockClear();

    // pointercancel should reset gesture
    container.dispatchEvent(new PointerEvent("pointerdown", { clientX: 0 }));
    container.dispatchEvent(new PointerEvent("pointercancel"));
    container.dispatchEvent(new PointerEvent("pointerup", { clientX: 100 }));
    expect(prevSpy).not.toHaveBeenCalled();

    // after cancel, a fresh pointer swipe should navigate
    container.dispatchEvent(new PointerEvent("pointerdown", { clientX: 0 }));
    container.dispatchEvent(new PointerEvent("pointerup", { clientX: 100 }));
    expect(prevSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
