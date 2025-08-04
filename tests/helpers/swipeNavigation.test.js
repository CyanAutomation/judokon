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
    container.scrollBy = vi.fn();

    setupSwipeNavigation(container);

    container.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 100, pointerType: "mouse" })
    );
    container.dispatchEvent(new PointerEvent("pointerup", { clientX: 0, pointerType: "mouse" }));
    expect(container.scrollBy).toHaveBeenCalledWith({
      left: container.clientWidth,
      behavior: "smooth"
    });

    container.scrollBy.mockClear();

    const endX = CAROUSEL_SWIPE_THRESHOLD + 60;
    container.dispatchEvent(new PointerEvent("pointerdown", { clientX: 0, pointerType: "mouse" }));
    container.dispatchEvent(new PointerEvent("pointerup", { clientX: endX, pointerType: "mouse" }));
    expect(container.scrollBy).toHaveBeenCalledWith({
      left: -container.clientWidth,
      behavior: "smooth"
    });
  });
});
