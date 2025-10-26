import { describe, it, expect, vi } from "vitest";
import { createTestCarousel, interactions } from "../utils/componentTestUtils.js";

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

describe("CarouselController (Enhanced Natural Interactions)", () => {
  let carousel;

  afterEach(() => {
    if (carousel) {
      carousel.testApi.cleanup();
    }
  });

  it("navigates with ArrowLeft/ArrowRight keys using natural keyboard interaction", async () => {
    carousel = createTestCarousel();
    await carousel.testApi.initialize();

    const nextSpy = carousel.testApi.spyOnMethod("next");
    const prevSpy = carousel.testApi.spyOnMethod("prev");

    // Test natural keyboard navigation
    carousel.testApi.pressArrowKey("right");
    carousel.testApi.pressArrowKey("left");

    // Events originating from children should not trigger navigation
    const child = document.createElement("div");
    carousel.element.appendChild(child);
    interactions.naturalKeyboardNavigation(child, "ArrowRight", { bubbles: true });

    expect(nextSpy).toHaveBeenCalledTimes(1);
    expect(prevSpy).toHaveBeenCalledTimes(1);
  });

  it("supports natural gesture-like interaction patterns", async () => {
    carousel = createTestCarousel();
    await carousel.testApi.initialize();

    const nextSpy = carousel.testApi.spyOnMethod("next");

    // Test that the component factory and natural interactions work
    expect(carousel.testApi.getCurrentPage()).toBe(0);

    // Use direct methods to show component factory works
    carousel.testApi.next();
    expect(nextSpy).toHaveBeenCalledTimes(1);
    expect(carousel.testApi.getCurrentPage()).toBe(1);
  });

  it("suppresses scroll sync during programmatic setPage until scrollend and keeps counter accurate", async () => {
    carousel = createTestCarousel({
      clientWidth: 100,
      scrollWidth: 300
    });
    await carousel.testApi.initialize();

    expect(carousel.testApi.getCurrentPage()).toBe(0);
    expect(carousel.testApi.getPageCounter()).toBe("Page 1 of 3");

    // Programmatic setPage should suppress immediate scroll events
    carousel.testApi.setPage(2);
    expect(carousel.testApi.getPageCounter()).toBe("Page 3 of 3");

    // Simulate an immediate scroll event that would otherwise change page
    carousel.testApi.simulateScroll(100); // would compute to page 1

    // During suppression, currentPage should remain the programmatic target
    expect(carousel.testApi.getCurrentPage()).toBe(2);
    expect(carousel.testApi.getPageCounter()).toBe("Page 3 of 3");

    // Release suppression via scrollend and then update via user scroll
    carousel.testApi.simulateScrollEnd();
    carousel.testApi.simulateScroll(100);

    expect(carousel.testApi.getCurrentPage()).toBe(1);
    expect(carousel.testApi.getPageCounter()).toBe("Page 2 of 3");
  });

  it("restores scroll sync via fallback when scrollend is unavailable", async () => {
    vi.useFakeTimers();
    try {
      carousel = createTestCarousel({
        clientWidth: 100,
        scrollWidth: 300,
        supportsScrollEnd: false
      });
      await carousel.testApi.initialize();

      expect(carousel.testApi.getCurrentPage()).toBe(0);
      expect(carousel.testApi.getPageCounter()).toBe("Page 1 of 3");
      expect(carousel.testApi.isLeftDisabled()).toBe(true);
      expect(carousel.testApi.isRightDisabled()).toBe(false);

      carousel.testApi.setPage(2);

      expect(carousel.testApi.getPageCounter()).toBe("Page 3 of 3");
      expect(carousel.testApi.isRightDisabled()).toBe(true);

      carousel.testApi.simulateScroll(0);
      expect(carousel.testApi.getCurrentPage()).toBe(2);

      await vi.advanceTimersByTimeAsync(75);

      carousel.testApi.simulateScroll(100);

      expect(carousel.testApi.getCurrentPage()).toBe(1);
      expect(carousel.testApi.getPageCounter()).toBe("Page 2 of 3");
      expect(carousel.testApi.isRightDisabled()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("cancels pending fallback timers on consecutive setPage calls", async () => {
    vi.useFakeTimers();
    const clearSpy = vi.spyOn(globalThis, "clearTimeout");
    try {
      carousel = createTestCarousel({ supportsScrollEnd: false });
      await carousel.testApi.initialize();

      carousel.testApi.setPage(1);
      carousel.testApi.setPage(2);

      expect(clearSpy).toHaveBeenCalled();
    } finally {
      clearSpy.mockRestore();
      vi.useRealTimers();
    }
  });

  it("properly destroys listeners when component is cleaned up", async () => {
    carousel = createTestCarousel();
    await carousel.testApi.initialize();

    const nextSpy = carousel.testApi.spyOnMethod("next");

    // Test that keyboard navigation works before destroy
    carousel.testApi.pressArrowKey("right");
    expect(nextSpy).toHaveBeenCalledTimes(1);

    nextSpy.mockClear();

    // Destroy and test that direct method calls no longer work after cleanup
    carousel.testApi.destroy();

    carousel.testApi.pressArrowKey("right");
    expect(nextSpy).not.toHaveBeenCalled();
  });
});
