import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("../../src/utils/scheduler.js", () => ({
  onFrame: (cb) => cb(),
  cancel: () => {}
}));
import { showSnackbar, updateSnackbar } from "../../src/helpers/showSnackbar.js";
import { SNACKBAR_FADE_MS, SNACKBAR_REMOVE_MS } from "../../src/helpers/constants.js";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("showSnackbar", () => {
  it("updates text and resets timers", () => {
    vi.useFakeTimers();

    showSnackbar("Hello");
    updateSnackbar("World");
    let bar = document.querySelector(".snackbar");
    expect(bar).toBeTruthy();
    expect(bar.textContent).toBe("World");
    expect(bar.classList.contains("show")).toBe(true);

    vi.advanceTimersByTime(SNACKBAR_FADE_MS - 1);
    expect(bar.classList.contains("show")).toBe(true);
    vi.advanceTimersByTime(1);
    expect(bar.classList.contains("show")).toBe(false);

    vi.advanceTimersByTime(SNACKBAR_REMOVE_MS - SNACKBAR_FADE_MS);
    expect(document.querySelector(".snackbar")).toBeNull();
  });
});
