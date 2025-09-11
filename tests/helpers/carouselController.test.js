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

  it("navigates via swipe gestures with threshold using natural touch", async () => {
    carousel = createTestCarousel();
    await carousel.testApi.initialize();

    const nextSpy = carousel.testApi.spyOnMethod("next");
    const prevSpy = carousel.testApi.spyOnMethod("prev");

    // Test natural swipe gestures (await for proper timing)
    await carousel.testApi.swipeGesture("left", 100); // left swipe -> next
    await carousel.testApi.swipeGesture("right", 100); // right swipe -> prev
    await carousel.testApi.swipeGesture("left", 20); // small swipe should be ignored

    expect(nextSpy).toHaveBeenCalledTimes(1);
    expect(prevSpy).toHaveBeenCalledTimes(1);
  });

  it("removes input listeners on destroy using natural interactions", async () => {
    carousel = createTestCarousel();
    await carousel.testApi.initialize();

    const prevSpy = carousel.testApi.spyOnMethod("prev");
    const nextSpy = carousel.testApi.spyOnMethod("next");

    // Test all interaction types work before destroy
    carousel.testApi.pressArrowKey("right");
    carousel.testApi.pressArrowKey("left");
    await carousel.testApi.swipeGesture("left", 100);
    await carousel.testApi.pointerGesture("right", 100);

    expect(nextSpy).toHaveBeenCalledTimes(2);
    expect(prevSpy).toHaveBeenCalledTimes(2);

    nextSpy.mockClear();
    prevSpy.mockClear();

    // Destroy and test that interactions no longer work
    carousel.testApi.destroy();

    carousel.testApi.pressArrowKey("right");
    carousel.testApi.pressArrowKey("left");
    await carousel.testApi.swipeGesture("left", 100);
    await carousel.testApi.pointerGesture("right", 100);

    expect(nextSpy).not.toHaveBeenCalled();
    expect(prevSpy).not.toHaveBeenCalled();
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

  it("resets state on cancel events using natural cancel simulation", async () => {
    carousel = createTestCarousel();
    await carousel.testApi.initialize();

    const prevSpy = carousel.testApi.spyOnMethod("prev");
    const nextSpy = carousel.testApi.spyOnMethod("next");

    // Test that cancel events reset gesture state naturally
    carousel.testApi.swipeGesture("left", 100);
    carousel.testApi.triggerCancel();

    // Allow time for gesture processing
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Cancel should prevent navigation
    expect(nextSpy).not.toHaveBeenCalled();
    expect(prevSpy).not.toHaveBeenCalled();

    // After cancel, fresh gestures should work normally
    carousel.testApi.swipeGesture("left", 100);

    // Allow time for gesture processing
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(nextSpy).toHaveBeenCalledTimes(1);
  });
});
