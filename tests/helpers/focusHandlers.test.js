import { describe, it, expect } from "vitest";
import { setupFocusHandlers } from "../../src/helpers/carousel/focus.js";

describe("setupFocusHandlers", () => {
  it("does not move focus when container is active", () => {
    const container = document.createElement("div");
    container.tabIndex = 0;
    document.body.append(container);

    setupFocusHandlers(container);
    container.focus();
    container.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    expect(document.activeElement).toBe(container);
  });

  it("moves focus between cards when one is focused", () => {
    const container = document.createElement("div");
    const first = document.createElement("button");
    first.className = "judoka-card";
    first.tabIndex = 0;
    const second = document.createElement("button");
    second.className = "judoka-card";
    second.tabIndex = 0;
    container.append(first, second);
    document.body.append(container);

    setupFocusHandlers(container);
    first.focus();
    first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(document.activeElement).toBe(second);
  });
});
