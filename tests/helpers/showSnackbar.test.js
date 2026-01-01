import { describe, it, expect, beforeEach } from "vitest";
import { showSnackbar, updateSnackbar } from "../../src/helpers/showSnackbar.js";

beforeEach(() => {
  document.body.innerHTML = '<div id="snackbar-container" role="status" aria-live="polite"></div>';
});

describe("showSnackbar", () => {
  const dispatchAnimationEnd = (target, animationName = "snackbar-cycle") => {
    const event = new Event("animationend");
    Object.defineProperty(event, "animationName", { value: animationName });
    target.dispatchEvent(event);
  };

  it("replaces the snackbar element on new calls", () => {
    const container = document.getElementById("snackbar-container");

    showSnackbar("First");
    expect(container.children).toHaveLength(1);
    expect(document.querySelectorAll("body > .snackbar")).toHaveLength(0);

    const first = container.firstElementChild;
    expect(first?.classList.contains("snackbar--active")).toBe(true);
    showSnackbar("Second");
    const second = container.firstElementChild;
    expect(second.textContent).toBe("Second");
    expect(container.children).toHaveLength(1);
    expect(first).not.toBe(second);
  });

  it("updateSnackbar mutates current child and preserves ARIA", () => {
    const container = document.getElementById("snackbar-container");

    showSnackbar("Hello");
    const bar = container.firstElementChild;
    updateSnackbar("World");
    expect(container.firstElementChild).toBe(bar);
    expect(bar.textContent).toBe("World");
    expect(bar.classList.contains("snackbar--active")).toBe(true);
    expect(container.getAttribute("role")).toBe("status");
    expect(container.getAttribute("aria-live")).toBe("polite");
  });

  it("removes the snackbar when the animation finishes", () => {
    const container = document.getElementById("snackbar-container");
    showSnackbar("Goodbye");
    const bar = container.firstElementChild;
    dispatchAnimationEnd(bar);
    expect(container.children).toHaveLength(0);
  });
});
