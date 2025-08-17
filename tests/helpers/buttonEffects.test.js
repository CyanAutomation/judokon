import { describe, it, expect, beforeEach, vi } from "vitest";
import { setupButtonEffects } from "../../src/helpers/buttonEffects.js";
import * as motionUtils from "../../src/helpers/motionUtils.js";
let button;

describe("setupButtonEffects", () => {
  beforeEach(() => {
    button = document.createElement("button");
    document.body.appendChild(button);
    window.matchMedia = vi.fn().mockImplementation((q) => ({
      matches: false,
      media: q,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
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

  it("does not create multiple ripples if one already exists", () => {
    setupButtonEffects();
    const event = new MouseEvent("mousedown");
    Object.defineProperty(event, "offsetX", { value: 5 });
    Object.defineProperty(event, "offsetY", { value: 10 });
    button.dispatchEvent(event);

    // Try to trigger another ripple before the first is removed
    button.dispatchEvent(event);
    expect(button.querySelectorAll("span.ripple").length).toBe(1);
  });

  it("does not throw if animationend is dispatched with no ripple", () => {
    setupButtonEffects();
    // Should not throw
    expect(() => {
      button.dispatchEvent(new Event("animationend"));
    }).not.toThrow();
  });

  it("does not apply effect to non-button elements", () => {
    setupButtonEffects();
    const div = document.createElement("div");
    document.body.appendChild(div);
    const event = new MouseEvent("mousedown");
    Object.defineProperty(event, "offsetX", { value: 1 });
    Object.defineProperty(event, "offsetY", { value: 2 });
    div.dispatchEvent(event);
    expect(div.querySelector("span.ripple")).toBeNull();
  });

  it("skips ripple when motion reduction is preferred", () => {
    vi.spyOn(motionUtils, "shouldReduceMotionSync").mockReturnValue(true);
    setupButtonEffects();
    const event = new MouseEvent("mousedown");
    button.dispatchEvent(event);
    expect(button.querySelector("span.ripple")).toBeNull();
  });
});