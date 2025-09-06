import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setupHamburger } from "../../src/helpers/navigation/navigationUI.js";

describe("setupHamburger", () => {
  let cleanup;
  let addSpy;
  let removeSpy;

  beforeEach(() => {
    document.body.innerHTML = '<nav class="bottom-navbar"><ul><li></li></ul></nav>';
    window.innerWidth = 320;
    cleanup = () => {};
    addSpy = undefined;
    removeSpy = undefined;
  });

  afterEach(() => {
    addSpy?.mockRestore();
    removeSpy?.mockRestore();
    cleanup();
  });

  it("creates a toggle button and toggles aria-expanded", () => {
    cleanup = setupHamburger();
    const button = document.querySelector(".nav-toggle");
    const list = document.querySelector(".bottom-navbar ul");
    expect(button).toBeTruthy();
    expect(button?.getAttribute("aria-expanded")).toBe("false");
    button?.dispatchEvent(new Event("click"));
    expect(button?.getAttribute("aria-expanded")).toBe("true");
    expect(list?.classList.contains("expanded")).toBe(true);
  });

  it("removes the button when resized above breakpoint", () => {
    cleanup = setupHamburger();
    window.innerWidth = 1024;
    window.dispatchEvent(new Event("resize"));
    expect(document.querySelector(".nav-toggle")).toBeNull();
  });

  it("cleanup removes the button and listeners", () => {
    addSpy = vi.spyOn(window, "addEventListener");
    removeSpy = vi.spyOn(window, "removeEventListener");
    cleanup = setupHamburger();
    const button = document.querySelector(".nav-toggle");
    expect(button).toBeTruthy();
    expect(addSpy).toHaveBeenCalledWith("resize", expect.any(Function));
    cleanup();
    expect(removeSpy).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(document.querySelector(".nav-toggle")).toBeNull();
  });

  it("does not duplicate button on multiple resizes", () => {
    cleanup = setupHamburger();
    for (let i = 0; i < 3; i++) {
      window.innerWidth = 320;
      window.dispatchEvent(new Event("resize"));
    }
    expect(document.querySelectorAll(".nav-toggle").length).toBe(1);
  });
});
