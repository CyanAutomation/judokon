import { describe, it, expect, vi, beforeEach } from "vitest";
import { showSnackbar } from "../../src/helpers/showSnackbar.js";
import { SNACKBAR_FADE_MS, SNACKBAR_REMOVE_MS } from "../../src/helpers/constants.js";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("showSnackbar", () => {
  it("shows and removes the snackbar", () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (cb) => cb());

    showSnackbar("Hello");
    let bar = document.querySelector(".snackbar");
    expect(bar).toBeTruthy();
    expect(bar.classList.contains("show")).toBe(true);

    vi.advanceTimersByTime(SNACKBAR_FADE_MS);
    bar = document.querySelector(".snackbar");
    expect(bar).toBeTruthy();
    expect(bar.classList.contains("show")).toBe(false);

    vi.advanceTimersByTime(SNACKBAR_REMOVE_MS - SNACKBAR_FADE_MS);
    expect(document.querySelector(".snackbar")).toBeNull();
  });
});
