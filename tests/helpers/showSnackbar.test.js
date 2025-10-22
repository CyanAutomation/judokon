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
  const expectSnackbarLifecycle = (container, { initial, updated, tick }) => {
    expect(() => showSnackbar(initial)).not.toThrow();
    tick?.();
    const bar = container.firstElementChild;
    expect(bar?.textContent).toBe(initial);
    expect(bar?.classList.contains("show")).toBe(true);

    updateSnackbar(updated);
    tick?.();
    expect(container.firstElementChild).toBe(bar);
    expect(container.firstElementChild?.textContent).toBe(updated);
    expect(container.firstElementChild?.classList.contains("show")).toBe(true);
  };

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

  it("uses global requestAnimationFrame when scheduler omits it", () => {
    const timers = useCanonicalTimers();
    const container = document.getElementById("snackbar-container");
    const mockRaf = vi.fn((cb) => {
      cb(0);
      return 1;
    });
    const schedulerWithoutRaf = {
      ...realScheduler,
      requestAnimationFrame: undefined
    };

    vi.stubGlobal("requestAnimationFrame", mockRaf);
    setScheduler(schedulerWithoutRaf);

    try {
      expectSnackbarLifecycle(container, {
        initial: "Fallback",
        updated: "Updated"
      });
      expect(mockRaf).toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
      try {
        setScheduler(realScheduler);
      } catch {}
      timers.cleanup();
    }
  });

  it("falls back to setTimeout when no requestAnimationFrame APIs exist", () => {
    const timers = useCanonicalTimers();
    const container = document.getElementById("snackbar-container");

    vi.stubGlobal("requestAnimationFrame", undefined);
    vi.stubGlobal("cancelAnimationFrame", undefined);
    setScheduler(realScheduler);

    try {
      expectSnackbarLifecycle(container, {
        initial: "Timer fallback",
        updated: "Timer fallback updated",
        tick: () => {
          vi.advanceTimersByTime(0);
        }
      });
    } finally {
      vi.unstubAllGlobals();
      try {
        setScheduler(realScheduler);
      } catch {}
      timers.cleanup();
    }
  });
});
