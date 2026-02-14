import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";

vi.mock("../../src/helpers/debugFlagPerformance.js", () => ({
  measureDebugFlagToggle: vi.fn((_flag, action) => {
    if (typeof action === "function") {
      return action();
    }
    return action;
  })
}));

let timers;

beforeEach(() => {
  document.body.innerHTML = "";
  vi.resetModules();
  timers = useCanonicalTimers();

  globalThis.requestIdleCallback = (cb) =>
    setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 }), 1);
  globalThis.cancelIdleCallback = (id) => clearTimeout(id);

  globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
});

afterEach(() => {
  timers.cleanup();
  delete globalThis.requestIdleCallback;
  delete globalThis.cancelIdleCallback;
  delete globalThis.requestAnimationFrame;
  delete globalThis.cancelAnimationFrame;
});

async function flushScheduledWork() {
  await timers.runAllTimersAsync();
  await Promise.resolve();
}

describe("toggleLayoutDebugPanel", () => {
  it("adds outlines when enabled and cleans up when disabled", async () => {
    const { toggleLayoutDebugPanel, flushLayoutDebugPanelWork } = await import(
      "../../src/helpers/layoutDebugPanel.js"
    );
    document.body.innerHTML = '<div id="custom"></div>';
    const el = document.getElementById("custom");
    Object.defineProperty(el, "offsetParent", { get: () => document.body });

    const pending = toggleLayoutDebugPanel(true, ["#custom"]);
    await flushScheduledWork();
    await flushLayoutDebugPanelWork();
    await pending;

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

    const pending = toggleLayoutDebugPanel(true);
    await flushScheduledWork();
    await flushLayoutDebugPanelWork();
    await pending;

    expect(el.classList.contains("layout-debug-outline")).toBe(true);
  });

  it("coalesces rapid enable toggles into a single outline run", async () => {
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

    await flushScheduledWork();
    await flushLayoutDebugPanelWork();
    await first;

    expect(measureDebugFlagToggle).toHaveBeenCalledTimes(1);
  });

  it("falls back when requestAnimationFrame exists but never invokes callback", async () => {
    globalThis.requestIdleCallback = undefined;
    globalThis.cancelIdleCallback = undefined;
    globalThis.requestAnimationFrame = vi.fn(() => 77);
    globalThis.cancelAnimationFrame = vi.fn();

    const { toggleLayoutDebugPanel, flushLayoutDebugPanelWork } = await import(
      "../../src/helpers/layoutDebugPanel.js"
    );

    document.body.innerHTML = '<div id="raf-stuck"></div>';
    const el = document.getElementById("raf-stuck");
    Object.defineProperty(el, "offsetParent", { get: () => document.body });

    const pending = toggleLayoutDebugPanel(true, ["#raf-stuck"]);

    await flushScheduledWork();
    await expect(flushLayoutDebugPanelWork()).resolves.toBeUndefined();
    await pending;

    expect(el.classList.contains("layout-debug-outline")).toBe(true);
    expect(globalThis.requestAnimationFrame).toHaveBeenCalledTimes(1);
  });
});
