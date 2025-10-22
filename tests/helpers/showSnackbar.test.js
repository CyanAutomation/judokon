import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";
vi.mock("../../src/utils/scheduler.js", () => ({
  onFrame: (cb) => cb(),
  cancel: () => {},
  stop: vi.fn()
}));
import { showSnackbar, updateSnackbar } from "../../src/helpers/showSnackbar.js";
import { SNACKBAR_FADE_MS, SNACKBAR_REMOVE_MS } from "../../src/helpers/constants.js";
import { setScheduler, realScheduler } from "../../src/helpers/scheduler.js";

beforeEach(() => {
  document.body.innerHTML = '<div id="snackbar-container" role="status" aria-live="polite"></div>';
});

describe("showSnackbar", () => {
  it("reuses container and resets timers on new calls", () => {
    const timers = useCanonicalTimers();
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
    timers.cleanup();
  });

  it("updateSnackbar mutates current child and preserves ARIA", () => {
    const timers = useCanonicalTimers();
    const container = document.getElementById("snackbar-container");

    showSnackbar("Hello");
    const bar = container.firstElementChild;
    updateSnackbar("World");
    expect(container.firstElementChild).toBe(bar);
    expect(bar.textContent).toBe("World");
    expect(container.getAttribute("role")).toBe("status");
    expect(container.getAttribute("aria-live")).toBe("polite");
    timers.cleanup();
  });

  it("gracefully handles scheduler without requestAnimationFrame using global fallback", () => {
    const timers = useCanonicalTimers();
    const container = document.getElementById("snackbar-container");
    const originalRaf = globalThis.requestAnimationFrame;
    const schedulerWithoutRaf = {
      setTimeout: (...args) => globalThis.setTimeout(...args),
      clearTimeout: (...args) => globalThis.clearTimeout(...args),
      requestAnimationFrame: undefined
    };

    setScheduler(schedulerWithoutRaf);
    globalThis.requestAnimationFrame = (cb) => {
      cb(0);
      return 0;
    };

    try {
      expect(() => showSnackbar("Fallback")).not.toThrow();
      const bar = container.firstElementChild;
      expect(bar?.textContent).toBe("Fallback");
      expect(bar?.classList.contains("show")).toBe(true);

      updateSnackbar("Updated");
      expect(container.firstElementChild?.textContent).toBe("Updated");
      expect(container.firstElementChild?.classList.contains("show")).toBe(true);
    } finally {
      try {
        globalThis.requestAnimationFrame = originalRaf;
      } catch {}
      try {
        setScheduler(realScheduler);
      } catch {}
      timers.cleanup();
    }
  });

  it("falls back to setTimeout when no requestAnimationFrame APIs exist", () => {
    const timers = useCanonicalTimers();
    const container = document.getElementById("snackbar-container");
    const originalRaf = globalThis.requestAnimationFrame;
    const originalCancel = globalThis.cancelAnimationFrame;

    globalThis.requestAnimationFrame = undefined;
    globalThis.cancelAnimationFrame = undefined;
    setScheduler(realScheduler);

    try {
      expect(() => showSnackbar("Timer fallback")).not.toThrow();
      vi.advanceTimersByTime(0);
      const bar = container.firstElementChild;
      expect(bar?.textContent).toBe("Timer fallback");
      expect(bar?.classList.contains("show")).toBe(true);

      updateSnackbar("Timer fallback updated");
      expect(container.firstElementChild?.textContent).toBe("Timer fallback updated");
      expect(container.firstElementChild?.classList.contains("show")).toBe(true);
    } finally {
      try {
        globalThis.requestAnimationFrame = originalRaf;
      } catch {}
      try {
        globalThis.cancelAnimationFrame = originalCancel;
      } catch {}
      try {
        setScheduler(realScheduler);
      } catch {}
      timers.cleanup();
    }
  });
});
