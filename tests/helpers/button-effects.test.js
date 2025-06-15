import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { setupButtonEffects } from "../../src/helpers/buttonEffects.js";

let button;

describe("setupButtonEffects", () => {
  beforeEach(() => {
    button = document.createElement("button");
    document.body.appendChild(button);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("creates and removes a ripple on mousedown", () => {
    setupButtonEffects();
    const event = new MouseEvent("mousedown");
    Object.defineProperty(event, "offsetX", { value: 5 });
    Object.defineProperty(event, "offsetY", { value: 10 });
    button.dispatchEvent(event);

    const ripple = button.querySelector("span.ripple");
    expect(ripple).toBeTruthy();
    expect(ripple.style.left).toBe("5px");
    expect(ripple.style.top).toBe("10px");

    ripple.dispatchEvent(new Event("animationend"));
    expect(button.querySelector("span.ripple")).toBeNull();
  });
});
