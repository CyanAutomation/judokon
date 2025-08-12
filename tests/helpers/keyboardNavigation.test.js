import { describe, it, expect } from "vitest";
import { setupKeyboardNavigation } from "../../src/helpers/carousel/navigation.js";

describe("setupKeyboardNavigation", () => {
  it("scrolls container on arrow keys when container is focused", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "clientWidth", { value: 300, configurable: true });
    container.scrollLeft = 0;
    document.body.append(container);

    setupKeyboardNavigation(container);
    expect(container.tabIndex).toBe(0);

    container.focus();
    container.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    expect(container.scrollLeft).toBe(container.clientWidth);
    container.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
    expect(container.scrollLeft).toBe(0);
  });

  it("ignores arrow keys when a card has focus", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "clientWidth", { value: 300, configurable: true });
    container.scrollLeft = 0;

    const card = document.createElement("button");
    card.className = "judoka-card";
    card.tabIndex = 0;
    container.append(card);
    document.body.append(container);

    setupKeyboardNavigation(container);

    card.focus();
    card.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(container.scrollLeft).toBe(0);
    expect(document.activeElement).toBe(card);
  });
});
