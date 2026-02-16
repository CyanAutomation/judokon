import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { showSnackbar, updateSnackbar, dismissSnackbar } from "../../src/helpers/showSnackbar.js";
import { useCanonicalTimers } from "../setup/fakeTimers.js";

beforeEach(() => {
  document.body.innerHTML = '<div id="snackbar-container" role="status" aria-live="polite"></div>';
  useCanonicalTimers();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.restoreAllMocks();
});

describe("showSnackbar", () => {
  const dispatchAnimationEnd = (target, animationName = "snackbar-cycle") => {
    const event = new Event("animationend");
    Object.defineProperty(event, "animationName", { value: animationName });
    target.dispatchEvent(event);
  };

  it("stacks multiple snackbars concurrently", () => {
    const container = document.getElementById("snackbar-container");

    showSnackbar("First");
    expect(container.children).toHaveLength(1);
    expect(document.querySelectorAll("body > .snackbar")).toHaveLength(0);

    const first = container.children[0];
    expect(first?.classList.contains("snackbar--active")).toBe(true);
    expect(first?.classList.contains("snackbar-bottom")).toBe(true);
    expect(first?.hasAttribute("role")).toBe(false);
    expect(first?.hasAttribute("aria-live")).toBe(false);
    expect(first?.hasAttribute("aria-atomic")).toBe(false);

    // Add second message - should stack, not replace
    showSnackbar("Second");
    expect(container.children).toHaveLength(2);

    // First message should be pushed to top with reduced opacity
    expect(first.classList.contains("snackbar-top")).toBe(true);
    expect(first.classList.contains("snackbar-stale")).toBe(true);
    expect(first.classList.contains("snackbar-bottom")).toBe(false);

    // Second message should be at bottom with full opacity
    const second = container.children[1];
    expect(second.textContent).toBe("Second");
    expect(second.classList.contains("snackbar-bottom")).toBe(true);
    expect(second.classList.contains("snackbar-top")).toBe(false);
    expect(second.classList.contains("snackbar-stale")).toBe(false);
  });

  it("uses a single live-region level on the snackbar container", () => {
    const container = document.getElementById("snackbar-container");

    showSnackbar("Live region check");

    const liveRegionChildren = container.querySelectorAll('[role="status"], [aria-live]');
    expect(container.getAttribute("role")).toBe("status");
    expect(container.getAttribute("aria-live")).toBe("polite");
    expect(container.getAttribute("aria-atomic")).toBe("false");
    expect(liveRegionChildren).toHaveLength(0);
  });

  it("evicts oldest message when a third message is shown", () => {
    const container = document.getElementById("snackbar-container");

    showSnackbar("First");
    showSnackbar("Second");
    expect(container.children).toHaveLength(2);

    const firstEl = container.children[0];
    const secondEl = container.children[1];

    // Add 3rd message - should evict oldest due to max-visible=2
    showSnackbar("Third");
    expect(container.children).toHaveLength(2);

    // First should be evicted
    expect(container.contains(firstEl)).toBe(false);

    // Second should still be visible and stale
    expect(secondEl.classList.contains("snackbar-top")).toBe(true);
    expect(secondEl.classList.contains("snackbar-stale")).toBe(true);

    const thirdEl = container.children[1];
    expect(thirdEl.textContent).toBe("Third");
    expect(thirdEl.classList.contains("snackbar-bottom")).toBe(true);
  });

  it("keeps only two visible snackbars for 3 rapid messages", () => {
    const container = document.getElementById("snackbar-container");

    showSnackbar("Rapid 1");
    showSnackbar("Rapid 2");
    showSnackbar("Rapid 3");

    expect(container.children).toHaveLength(2);
    expect(Array.from(container.children).map((el) => el.textContent)).toEqual([
      "Rapid 2",
      "Rapid 3"
    ]);
  });

  it("does not alter remaining snackbar timers after overflow eviction", async () => {
    const container = document.getElementById("snackbar-container");

    showSnackbar({ text: "First", ttl: 1000 });
    const firstEl = container.children[0];

    await vi.advanceTimersByTimeAsync(100);

    showSnackbar({ text: "Second", ttl: 900 });
    const secondEl = container.children[1];

    await vi.advanceTimersByTimeAsync(100);

    showSnackbar({ text: "Third", ttl: 1000 });
    const thirdEl = container.children[1];

    expect(container.contains(firstEl)).toBe(false);
    expect(container.contains(secondEl)).toBe(true);
    expect(container.contains(thirdEl)).toBe(true);

    // Second should expire based on its own timer; third should remain.
    await vi.advanceTimersByTimeAsync(700);
    dispatchAnimationEnd(secondEl);
    await Promise.resolve();

    expect(container.contains(secondEl)).toBe(false);
    expect(container.contains(thirdEl)).toBe(true);
    expect(container.children).toHaveLength(1);

    // Third should expire later on its own timer.
    await vi.advanceTimersByTimeAsync(200);
    dispatchAnimationEnd(thirdEl);
    await Promise.resolve();

    expect(container.children).toHaveLength(0);
  });

  it("each snackbar has independent auto-dismiss timer (3000ms)", async () => {
    const container = document.getElementById("snackbar-container");

    showSnackbar("First");
    expect(container.children).toHaveLength(1);
    const firstEl = container.children[0];

    // Wait 1 second before showing second message
    await vi.advanceTimersByTimeAsync(1000);

    showSnackbar("Second");
    expect(container.children).toHaveLength(2);
    const secondEl = container.children[1];

    // Advance 2 more seconds (total 3s for first message)
    // First message timer should fire
    await vi.advanceTimersByTimeAsync(2000);
    dispatchAnimationEnd(firstEl);
    await Promise.resolve();

    // First should be dismissed, second should remain
    expect(container.contains(firstEl)).toBe(false);
    expect(container.contains(secondEl)).toBe(true);
    expect(container.children).toHaveLength(1);

    // Second message should now be at bottom (only message)
    expect(secondEl.classList.contains("snackbar-bottom")).toBe(true);
    expect(secondEl.classList.contains("snackbar-top")).toBe(false);
    expect(secondEl.classList.contains("snackbar-stale")).toBe(false);

    // Advance 1 more second (total 3s for second message)
    await vi.advanceTimersByTimeAsync(1000);
    dispatchAnimationEnd(secondEl);
    await Promise.resolve();

    // Both should now be gone
    expect(container.children).toHaveLength(0);
  });

  it("updateSnackbar mutates most recent snackbar and preserves ARIA", () => {
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

  it("removes the snackbar when the animation finishes", async () => {
    const container = document.getElementById("snackbar-container");
    showSnackbar("Goodbye");
    const bar = container.firstElementChild;
    dispatchAnimationEnd(bar);
    await Promise.resolve();
    expect(container.children).toHaveLength(0);
  });

  it("handles rapid succession of messages with max-visible eviction", () => {
    const container = document.getElementById("snackbar-container");

    // Rapidly add 5 messages
    showSnackbar("Message 1");
    showSnackbar("Message 2");
    showSnackbar("Message 3");
    showSnackbar("Message 4");
    showSnackbar("Message 5");

    // Should keep only latest two messages
    expect(container.children).toHaveLength(2);

    // Last message should be bottom
    const messages = Array.from(container.children).map((el) => el.textContent);
    expect(messages).toEqual(["Message 4", "Message 5"]);

    // Older messages should have stale class
    expect(container.children[0].classList.contains("snackbar-stale")).toBe(true);
    // Bottom message should not
    expect(container.children[1].classList.contains("snackbar-stale")).toBe(false);
  });

  it("updateSnackbar is a no-op when there is no visible snackbar", () => {
    const container = document.getElementById("snackbar-container");
    updateSnackbar("Should not create");
    expect(container.children).toHaveLength(0);
  });

  it("dismissSnackbar removes targeted snackbar", async () => {
    const container = document.getElementById("snackbar-container");
    showSnackbar("First");
    showSnackbar("Second");

    const firstId = container.children[0]?.dataset?.snackbarId;
    dismissSnackbar(firstId);
    await Promise.resolve();

    expect(container.children).toHaveLength(1);
    expect(container.children[0].textContent).toBe("Second");
  });
});
