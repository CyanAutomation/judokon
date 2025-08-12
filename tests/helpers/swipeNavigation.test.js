import { describe, it, expect, vi } from "vitest";
import { setupSwipeNavigation } from "../../src/helpers/carousel/navigation.js";
import { CAROUSEL_SWIPE_THRESHOLD } from "../../src/helpers/constants.js";

if (typeof PointerEvent === "undefined") {
  globalThis.PointerEvent = class extends MouseEvent {
    constructor(type, params = {}) {
      super(type, params);
      this.pointerType = params.pointerType ?? "";
    }
  };
}

describe("setupSwipeNavigation", () => {
  it("scrolls container based on pointer swipe distance", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "clientWidth", { value: 300, configurable: true });
    Object.defineProperty(container, "scrollWidth", { value: 900, configurable: true });
    container.scrollTo = vi.fn(({ left }) => {
      container.scrollLeft = left;
    });

    setupSwipeNavigation(container);

    const swipe = (start, end) => {
      container.dispatchEvent(
        new PointerEvent("pointerdown", { clientX: start, pointerType: "mouse" })
      );
      container.dispatchEvent(
        new PointerEvent("pointerup", { clientX: end, pointerType: "mouse" })
      );
    };

    swipe(100, 0);
    expect(container.scrollTo).toHaveBeenCalledWith({
      left: 300,
      behavior: "smooth"
    });

    container.scrollTo.mockClear();
    swipe(100, 0);
    expect(container.scrollTo).toHaveBeenCalledWith({
      left: 600,
      behavior: "smooth"
    });

    container.scrollTo.mockClear();
    swipe(100, 0);
    expect(container.scrollTo).toHaveBeenCalledWith({
      left: 600,
      behavior: "smooth"
    });

    container.scrollTo.mockClear();
    const endX = CAROUSEL_SWIPE_THRESHOLD + 60;
    swipe(0, endX);
    expect(container.scrollTo).toHaveBeenCalledWith({
      left: 300,
      behavior: "smooth"
    });
  });
});
