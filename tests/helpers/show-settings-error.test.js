import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { showSettingsError } from "../../src/helpers/showSettingsError.js";

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("showSettingsError", () => {
  it("shows and then removes the error popup", () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (cb) => cb());

    showSettingsError();
    let popup = document.querySelector(".settings-error-popup");
    expect(popup).toBeTruthy();
    expect(popup.classList.contains("show")).toBe(true);

    vi.advanceTimersByTime(1800);
    popup = document.querySelector(".settings-error-popup");
    expect(popup).toBeTruthy();
    expect(popup.classList.contains("show")).toBe(false);

    vi.advanceTimersByTime(200);
    expect(document.querySelector(".settings-error-popup")).toBeNull();
  });
});
