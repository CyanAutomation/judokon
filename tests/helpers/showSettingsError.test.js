import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("../../src/utils/scheduler.js", () => ({
  onFrame: (cb) => cb(),
  cancel: () => {},
  stop: vi.fn()
}));
import { showSettingsError } from "../../src/helpers/showSettingsError.js";
import { SETTINGS_FADE_MS, SETTINGS_REMOVE_MS } from "../../src/helpers/constants.js";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("showSettingsError", () => {
  it("shows and then removes the error popup", () => {
    vi.useFakeTimers();

    showSettingsError();
    let popup = document.querySelector(".settings-error-popup");
    expect(popup).toBeTruthy();
    expect(popup.classList.contains("show")).toBe(true);

    vi.advanceTimersByTime(SETTINGS_FADE_MS);
    popup = document.querySelector(".settings-error-popup");
    expect(popup).toBeTruthy();
    expect(popup.classList.contains("show")).toBe(false);

    vi.advanceTimersByTime(SETTINGS_REMOVE_MS - SETTINGS_FADE_MS);
    expect(document.querySelector(".settings-error-popup")).toBeNull();
  });
});
