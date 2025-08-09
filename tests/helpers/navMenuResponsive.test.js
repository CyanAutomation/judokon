import { describe, it, expect, beforeEach } from "vitest";
import { setupHamburger } from "../../src/helpers/api/navigation.js";

describe("setupHamburger", () => {
  beforeEach(() => {
    document.body.innerHTML = '<nav class="bottom-navbar"><ul><li></li></ul></nav>';
    window.innerWidth = 320;
  });

  it("creates a toggle button and toggles aria-expanded", () => {
    setupHamburger();
    const button = document.querySelector(".nav-toggle");
    const list = document.querySelector(".bottom-navbar ul");
    expect(button).toBeTruthy();
    expect(button?.getAttribute("aria-expanded")).toBe("false");
    button?.dispatchEvent(new Event("click"));
    expect(button?.getAttribute("aria-expanded")).toBe("true");
    expect(list?.classList.contains("expanded")).toBe(true);
  });

  it("removes the button when resized above breakpoint", () => {
    setupHamburger();
    window.innerWidth = 1024;
    window.dispatchEvent(new Event("resize"));
    expect(document.querySelector(".nav-toggle")).toBeNull();
  });
});
