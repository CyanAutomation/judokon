import { describe, it, expect } from "vitest";
import { updateScrollButtonState } from "../../src/helpers/carouselBuilder.js";

describe("updateScrollButtonState", () => {
  it("disables left button at start", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "scrollWidth", { value: 300 });
    Object.defineProperty(container, "clientWidth", { value: 100 });
    container.scrollLeft = 0;
    const left = document.createElement("button");
    const right = document.createElement("button");
    updateScrollButtonState(container, left, right);
    expect(left.disabled).toBe(true);
    expect(right.disabled).toBe(false);
  });

  it("disables right button at end", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "scrollWidth", { value: 300 });
    Object.defineProperty(container, "clientWidth", { value: 100 });
    container.scrollLeft = 200;
    const left = document.createElement("button");
    const right = document.createElement("button");
    updateScrollButtonState(container, left, right);
    expect(left.disabled).toBe(false);
    expect(right.disabled).toBe(true);
  });

  it("enables both buttons in middle", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "scrollWidth", { value: 300 });
    Object.defineProperty(container, "clientWidth", { value: 100 });
    container.scrollLeft = 50;
    const left = document.createElement("button");
    const right = document.createElement("button");
    updateScrollButtonState(container, left, right);
    expect(left.disabled).toBe(false);
    expect(right.disabled).toBe(false);
  });
});
