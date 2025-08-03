import { describe, it, expect } from "vitest";
import { setupKeyboardNavigation } from "../../src/helpers/carousel/navigation.js";
import { CAROUSEL_SCROLL_DISTANCE } from "../../src/helpers/constants.js";

describe("setupKeyboardNavigation", () => {
  it("scrolls container and updates focus on arrow keys", () => {
    const container = document.createElement("div");
    container.scrollLeft = 0;
    container.scrollBy = ({ left }) => {
      container.scrollLeft += left;
    };

    const first = document.createElement("button");
    first.className = "judoka-card";
    first.tabIndex = 0;
    const second = document.createElement("button");
    second.className = "judoka-card";
    second.tabIndex = 0;
    const third = document.createElement("button");
    third.className = "judoka-card";
    third.tabIndex = 0;
    container.append(first, second, third);
    document.body.append(container);

    setupKeyboardNavigation(container);
    expect(container.tabIndex).toBe(0);

    first.focus();
    container.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    expect(container.scrollLeft).toBe(CAROUSEL_SCROLL_DISTANCE);
    expect(document.activeElement).toBe(second);

    container.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
    expect(container.scrollLeft).toBe(0);
    expect(document.activeElement).toBe(first);
  });
});
