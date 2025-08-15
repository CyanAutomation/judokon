import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("../../src/utils/scheduler.js", () => ({
  onFrame: (cb) => cb(),
  cancel: () => {},
  stop: vi.fn()
}));
import { showSnackbar, updateSnackbar } from "../../src/helpers/showSnackbar.js";
import { SNACKBAR_FADE_MS, SNACKBAR_REMOVE_MS } from "../../src/helpers/constants.js";

beforeEach(() => {
  document.body.innerHTML = '<div id="snackbar-container" role="status" aria-live="polite"></div>';
});

describe("showSnackbar", () => {
  it("reuses container and resets timers on new calls", () => {
    vi.useFakeTimers();
    const container = document.getElementById("snackbar-container");

    showSnackbar("First");
    expect(container.children).toHaveLength(1);
    expect(document.querySelectorAll("body > .snackbar")).toHaveLength(0);

    const first = container.firstElementChild;
    showSnackbar("Second");
    const second = container.firstElementChild;
    expect(second.textContent).toBe("Second");
    expect(container.children).toHaveLength(1);
    expect(first).not.toBe(second);

    vi.advanceTimersByTime(SNACKBAR_FADE_MS - 1);
    expect(second.classList.contains("show")).toBe(true);
    vi.advanceTimersByTime(1);
    expect(second.classList.contains("show")).toBe(false);
    vi.advanceTimersByTime(SNACKBAR_REMOVE_MS - SNACKBAR_FADE_MS);
    expect(container.children).toHaveLength(0);
  });

  it("updateSnackbar mutates current child and preserves ARIA", () => {
    vi.useFakeTimers();
    const container = document.getElementById("snackbar-container");

    showSnackbar("Hello");
    const bar = container.firstElementChild;
    updateSnackbar("World");
    expect(container.firstElementChild).toBe(bar);
    expect(bar.textContent).toBe("World");
    expect(container.getAttribute("role")).toBe("status");
    expect(container.getAttribute("aria-live")).toBe("polite");
  });
});
