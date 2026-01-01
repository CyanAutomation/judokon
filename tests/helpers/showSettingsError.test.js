import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withMutedConsole } from "../utils/console.js";
import { showSettingsError } from "../../src/helpers/showSettingsError.js";

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("showSettingsError", () => {
  it("shows and then clears the error popup after animation end", async () => {
    await withMutedConsole(() => {
      const errSpy = vi.spyOn(console, "error");
      showSettingsError();
      expect(errSpy).not.toHaveBeenCalled();
      errSpy.mockRestore();
    });

    const popup = document.querySelector(".settings-error-popup");
    expect(popup).toBeTruthy();
    expect(popup.hasAttribute("open")).toBe(true);

    const animationEvent = new Event("animationend");
    Object.defineProperty(animationEvent, "animationName", {
      value: "settings-error-popup-fade"
    });
    popup.dispatchEvent(animationEvent);

    expect(popup.hasAttribute("open")).toBe(false);
    expect(popup.textContent).toBe("");
  });

  it("replaces existing popup on subsequent calls", async () => {
    await withMutedConsole(() => {
      const errSpy = vi.spyOn(console, "error");
      showSettingsError();
      expect(errSpy).not.toHaveBeenCalled();
      errSpy.mockRestore();
    });
    expect(document.querySelectorAll(".settings-error-popup")).toHaveLength(1);

    await withMutedConsole(() => {
      const errSpy = vi.spyOn(console, "error");
      showSettingsError();
      expect(errSpy).not.toHaveBeenCalled();
      errSpy.mockRestore();
    });
    expect(document.querySelectorAll(".settings-error-popup")).toHaveLength(1);

    const popup = document.querySelector(".settings-error-popup");
    expect(popup).toBeTruthy();

    const animationEvent = new Event("animationend");
    Object.defineProperty(animationEvent, "animationName", {
      value: "settings-error-popup-fade"
    });
    popup.dispatchEvent(animationEvent);

    expect(popup.hasAttribute("open")).toBe(false);
  });
});
