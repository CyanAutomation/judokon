import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
vi.mock("../../src/utils/scheduler.js", () => ({
  onFrame: (cb) => cb(),
  cancel: () => {},
  stop: vi.fn()
}));
import { withMutedConsole } from "../utils/console.js";
import { showSettingsError } from "../../src/helpers/showSettingsError.js";
import { SETTINGS_FADE_MS, SETTINGS_REMOVE_MS } from "../../src/helpers/constants.js";

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("showSettingsError", () => {
  it("shows and then removes the error popup", async () => {
    const timers = useCanonicalTimers();

    await withMutedConsole(() => {
      const errSpy = vi.spyOn(console, "error");
      showSettingsError();
      expect(errSpy).not.toHaveBeenCalled();
      errSpy.mockRestore();
    });

    let popup = document.querySelector(".settings-error-popup");
    expect(popup).toBeTruthy();
    expect(popup.classList.contains("show")).toBe(true);

    vi.advanceTimersByTime(SETTINGS_FADE_MS);
    popup = document.querySelector(".settings-error-popup");
    expect(popup).toBeTruthy();
    expect(popup.classList.contains("show")).toBe(false);

    vi.advanceTimersByTime(SETTINGS_REMOVE_MS - SETTINGS_FADE_MS);
    expect(document.querySelector(".settings-error-popup")).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    timers.cleanup();
  });

  it("replaces existing popup on subsequent calls", async () => {
    const timers = useCanonicalTimers();

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

    vi.advanceTimersByTime(SETTINGS_REMOVE_MS);
    expect(document.querySelector(".settings-error-popup")).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    timers.cleanup();
  });
});
