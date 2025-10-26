import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("../../src/helpers/debugFlagPerformance.js", () => ({
  measureDebugFlagToggle: vi.fn((_flag, action) => {
    if (typeof action === "function") {
      return action();
    }
    return action;
  })
}));

beforeEach(() => {
  document.body.innerHTML = "";
  vi.resetModules();
});

const originalRequestIdleCallback = globalThis.requestIdleCallback;
const originalCancelIdleCallback = globalThis.cancelIdleCallback;
const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;

afterEach(() => {
  vi.useRealTimers();
  if (typeof originalRequestIdleCallback === "function") {
    globalThis.requestIdleCallback = originalRequestIdleCallback;
  } else {
    delete globalThis.requestIdleCallback;
  }
  if (typeof originalCancelIdleCallback === "function") {
    globalThis.cancelIdleCallback = originalCancelIdleCallback;
  } else {
    delete globalThis.cancelIdleCallback;
  }
  if (typeof originalRequestAnimationFrame === "function") {
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
  } else {
    delete globalThis.requestAnimationFrame;
  }
  if (typeof originalCancelAnimationFrame === "function") {
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
  } else {
    delete globalThis.cancelAnimationFrame;
  }
});

describe("toggleLayoutDebugPanel", () => {
  it("adds outlines when enabled and cleans up when disabled", async () => {
    const { toggleLayoutDebugPanel, flushLayoutDebugPanelWork } = await import(
      "../../src/helpers/layoutDebugPanel.js"
    );
    document.body.innerHTML = '<div id="custom"></div>';
    const el = document.getElementById("custom");
    Object.defineProperty(el, "offsetParent", { get: () => document.body });
    await toggleLayoutDebugPanel(true, ["#custom"]);
    await flushLayoutDebugPanelWork();
    expect(el.classList.contains("layout-debug-outline")).toBe(true);
    await toggleLayoutDebugPanel(false, ["#custom"]);
    expect(el.classList.contains("layout-debug-outline")).toBe(false);
  });

  it("adds outlines to visible elements with default selector", async () => {
    const { toggleLayoutDebugPanel, flushLayoutDebugPanelWork } = await import(
      "../../src/helpers/layoutDebugPanel.js"
    );
    document.body.innerHTML = '<div id="sample"></div>';
    const el = document.getElementById("sample");
    Object.defineProperty(el, "offsetParent", { get: () => document.body });
    await toggleLayoutDebugPanel(true);
    await flushLayoutDebugPanelWork();
    expect(el.classList.contains("layout-debug-outline")).toBe(true);
  });

  it("coalesces rapid enable toggles into a single outline run", async () => {
    vi.useFakeTimers();
    globalThis.requestIdleCallback = undefined;
    globalThis.cancelIdleCallback = undefined;
    globalThis.requestAnimationFrame = (cb) => {
      cb();
      return 1;
    };
    globalThis.cancelAnimationFrame = () => {};

    const { toggleLayoutDebugPanel, flushLayoutDebugPanelWork } = await import(
      "../../src/helpers/layoutDebugPanel.js"
    );
    const { measureDebugFlagToggle } = await import("../../src/helpers/debugFlagPerformance.js");

    document.body.innerHTML = '<div id="target"></div>';
    const el = document.getElementById("target");
    Object.defineProperty(el, "offsetParent", { get: () => document.body });

    const first = toggleLayoutDebugPanel(true);
    const second = toggleLayoutDebugPanel(true);

    expect(second).toBe(first);

    await vi.runOnlyPendingTimersAsync();
    await flushLayoutDebugPanelWork();
    await first;

    expect(measureDebugFlagToggle).toHaveBeenCalledTimes(1);
  });
});
