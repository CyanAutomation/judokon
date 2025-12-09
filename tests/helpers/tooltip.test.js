import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTooltipHarness } from "./integrationHarness.js";

const harness = createTooltipHarness();

// ===== Top-level vi.hoisted() for shared mock state =====
const { fetchJson, loadSettings } = vi.hoisted(() => ({
  fetchJson: vi.fn(),
  loadSettings: vi.fn()
}));

// ===== Top-level vi.mock() calls =====
vi.mock("../../src/helpers/dataUtils.js", () => ({
  fetchJson
}));

vi.mock("../../src/helpers/settingsStorage.js", () => ({
  loadSettings
}));

beforeEach(async () => {
  document.body.innerHTML = "";
  fetchJson.mockClear();
  await harness.setup();
});

describe("initTooltips", () => {
  it("shows tooltip on hover and parses markdown", async () => {
    fetchJson.mockResolvedValue({
      stat: { test: "**Bold**\n_italic_" }
    });

    const { initTooltips } = await import(
      "../../src/helpers/tooltip.js"
    );

    const el = document.createElement("button");
    el.dataset.tooltipId = "stat.test";
    document.body.appendChild(el);

    await initTooltips();

    el.dispatchEvent(new Event("mouseover"));
    vi.runAllTimers();

    const tip = document.querySelector(".tooltip");
    expect(tip.innerHTML.replace(/\n/g, "")).toBe("<strong>Bold</strong><br><em>italic</em>");
    expect(tip.style.display).toBe("block");

    el.dispatchEvent(new Event("mouseout"));
    vi.runAllTimers();
    expect(tip.style.display).toBe("none");
  });

  it("shows fallback text and warns once for unknown ids", async () => {
    fetchJson.mockResolvedValue({});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { initTooltips } = await import(
      "../../src/helpers/tooltip.js"
    );

    const el = document.createElement("div");
    el.dataset.tooltipId = "missing";
    document.body.appendChild(el);

    await initTooltips();

    const tip = document.querySelector(".tooltip");

    el.dispatchEvent(new Event("mouseover"));
    vi.runAllTimers();
    expect(tip.textContent).toBe("More info coming…");
    el.dispatchEvent(new Event("mouseout"));
    vi.runAllTimers();
    el.dispatchEvent(new Event("mouseover"));
    vi.runAllTimers();

    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("shows fallback text and warns once when id is missing", async () => {
    fetchJson.mockResolvedValue({});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { initTooltips, SHOW_DELAY_MS, HIDE_DELAY_MS } = await import(
      "../../src/helpers/tooltip.js"
    );

    const el = document.createElement("div");
    el.setAttribute("data-tooltip-id", "");
    document.body.appendChild(el);

    await initTooltips();

    const tip = document.querySelector(".tooltip");

    el.dispatchEvent(new Event("mouseover"));
    vi.runAllTimers();
    expect(tip.textContent).toBe("More info coming…");
    el.dispatchEvent(new Event("mouseout"));
    vi.runAllTimers();
    el.dispatchEvent(new Event("mouseover"));
    vi.runAllTimers();

    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("falls back to leaf keys for parent ids", async () => {
    fetchJson.mockResolvedValue({
      settings: { theme: { description: "Theme description" } }
    });

    const { initTooltips } = await import("../../src/helpers/tooltip.js");

    const el = document.createElement("div");
    el.dataset.tooltipId = "settings.theme";
    document.body.appendChild(el);

    await initTooltips();

    const tip = document.querySelector(".tooltip");
    el.dispatchEvent(new Event("mouseover"));
    vi.runAllTimers();

    expect(tip.textContent).toBe("Theme description");
  });

  it("positions tooltip within viewport for zero-size targets", async () => {
    fetchJson.mockResolvedValue({ stat: { fix: "text" } });

    const { initTooltips } = await import("../../src/helpers/tooltip.js");

    const el = document.createElement("div");
    el.dataset.tooltipId = "stat.fix";
    document.body.appendChild(el);

    await initTooltips();

    const tip = document.querySelector(".tooltip");
    Object.defineProperty(tip, "offsetHeight", { value: 10 });
    el.getBoundingClientRect = () => ({ bottom: 0, left: 0, width: 0, height: 0 });

    el.dispatchEvent(new Event("mouseover"));
    vi.runAllTimers();

    expect(tip.style.top).toBe(`${window.innerHeight - 10}px`);
    expect(tip.style.left).toBe("0px");
  });

  it("repositions tooltip to avoid right overflow", async () => {
    fetchJson.mockResolvedValue({ stat: { fix: "text" } });

    const { initTooltips } = await import("../../src/helpers/tooltip.js");

    const el = document.createElement("div");
    el.dataset.tooltipId = "stat.fix";
    document.body.appendChild(el);

    await initTooltips();

    const tip = document.querySelector(".tooltip");
    Object.defineProperty(tip, "offsetWidth", { value: 40 });
    const originalWidth = document.documentElement.clientWidth;
    try {
      Object.defineProperty(document.documentElement, "clientWidth", {
        value: 100,
        configurable: true
      });
      el.getBoundingClientRect = () => ({
        bottom: 10,
        left: 80,
        width: 10,
        height: 10
      });

      el.dispatchEvent(new Event("mouseover"));
      vi.runAllTimers();

      expect(tip.style.left).toBe("60px");
    } finally {
      Object.defineProperty(document.documentElement, "clientWidth", {
        value: originalWidth,
        configurable: true
      });
    }
  });

  it("clamps left to zero when tip wider than viewport", async () => {
    fetchJson.mockResolvedValue({ stat: { fix: "text" } });

    const { initTooltips } = await import("../../src/helpers/tooltip.js");

    const el = document.createElement("div");
    el.dataset.tooltipId = "stat.fix";
    document.body.appendChild(el);

    await initTooltips();

    const tip = document.querySelector(".tooltip");
    Object.defineProperty(tip, "offsetWidth", { value: 150 });
    const originalWidth = document.documentElement.clientWidth;
    try {
      Object.defineProperty(document.documentElement, "clientWidth", {
        value: 100,
        configurable: true
      });
      el.getBoundingClientRect = () => ({
        bottom: 10,
        left: 0,
        width: 10,
        height: 10
      });

      el.dispatchEvent(new Event("mouseover"));
      vi.runAllTimers();

      expect(tip.style.left).toBe("0px");
    } finally {
      Object.defineProperty(document.documentElement, "clientWidth", {
        value: originalWidth,
        configurable: true
      });
    }
  });

  it("shows the correct descriptions for filter controls", async () => {
    fetchJson.mockResolvedValue({
      ui: {
        countryFilter: "**Country filter**\nToggle the panel to pick flags and narrow the roster.",
        clearFilter: "**Clear filter**\nShow all judoka."
      }
    });

    const { initTooltips } = await import("../../src/helpers/tooltip.js");

    const countryFilterToggle = document.createElement("button");
    countryFilterToggle.dataset.tooltipId = "ui.countryFilter";
    document.body.appendChild(countryFilterToggle);

    const clearFilterButton = document.createElement("button");
    clearFilterButton.dataset.tooltipId = "ui.clearFilter";
    document.body.appendChild(clearFilterButton);

    await initTooltips();

    const tip = document.querySelector(".tooltip");

    countryFilterToggle.dispatchEvent(new Event("mouseover"));
    vi.runAllTimers();
    expect(tip.textContent).toContain("Country filter");
    expect(tip.textContent).toContain("Toggle the panel to pick flags and narrow the roster.");
    countryFilterToggle.dispatchEvent(new Event("mouseout"));
    vi.runAllTimers();

    clearFilterButton.dispatchEvent(new Event("mouseover"));
    vi.runAllTimers();
    expect(tip.textContent).toContain("Clear filter");
    expect(tip.textContent).toContain("Show all judoka.");
    clearFilterButton.dispatchEvent(new Event("mouseout"));
    vi.runAllTimers();
  });

  it("applies overlay class when flag enabled", async () => {
    fetchJson.mockResolvedValue({ stat: { test: "text" } });
    loadSettings.mockResolvedValue({
      tooltips: true,
      featureFlags: { tooltipOverlayDebug: { enabled: true } }
    });

    const { initTooltips } = await import("../../src/helpers/tooltip.js");
    const el = document.createElement("div");
    el.dataset.tooltipId = "stat.test";
    document.body.appendChild(el);
    await initTooltips();
    const overlayDebug = await import("../../src/helpers/tooltipOverlayDebug.js");
    await overlayDebug.flushTooltipOverlayDebugWork();
    expect(document.body.classList.contains("tooltip-overlay-debug")).toBe(true);
  });

  it("does not apply overlay class when flag disabled", async () => {
    fetchJson.mockResolvedValue({ stat: { test: "text" } });
    loadSettings.mockResolvedValue({
      tooltips: true,
      featureFlags: { tooltipOverlayDebug: { enabled: false } }
    });

    const { initTooltips } = await import("../../src/helpers/tooltip.js");
    const el = document.createElement("div");
    el.dataset.tooltipId = "stat.test";
    document.body.appendChild(el);
    await initTooltips();
    const overlayDebug = await import("../../src/helpers/tooltipOverlayDebug.js");
    await overlayDebug.flushTooltipOverlayDebugWork();
    expect(document.body.classList.contains("tooltip-overlay-debug")).toBe(false);
  });

  it("returns cleanup function that removes listeners", async () => {
    fetchJson.mockResolvedValue({ stat: { test: "text" } });

    const { initTooltips } = await import("../../src/helpers/tooltip.js");

    const el = document.createElement("div");
    el.dataset.tooltipId = "stat.test";
    document.body.appendChild(el);

    const cleanup = await initTooltips();

    const tip = document.querySelector(".tooltip");
    el.dispatchEvent(new Event("mouseover"));
    vi.runAllTimers();
    expect(tip.style.display).toBe("block");
    el.dispatchEvent(new Event("mouseout"));
    vi.runAllTimers();
    expect(tip.style.display).toBe("none");

    cleanup();

    el.dispatchEvent(new Event("mouseover"));
    vi.runAllTimers();
    expect(tip.style.display).toBe("none");
  });

  it("delays hover display and hides after the configured dismissal interval", async () => {
    fetchJson.mockResolvedValue({ ui: { countryFilter: "filter copy" } });

    const { initTooltips, SHOW_DELAY_MS, HIDE_DELAY_MS } = await import(
      "../../src/helpers/tooltip.js"
    );

    const el = document.createElement("button");
    el.dataset.tooltipId = "ui.countryFilter";
    document.body.appendChild(el);

    await initTooltips();

    const tip = document.querySelector(".tooltip");
    el.dispatchEvent(new Event("mouseover"));
    expect(tip.style.display).toBe("none");

    // Test that tooltip doesn't show before delay
    vi.advanceTimersByTime(SHOW_DELAY_MS - 1);
    expect(tip.style.display).toBe("none");

    // Test that tooltip shows after delay
    vi.advanceTimersByTime(1);
    expect(tip.style.display).toBe("block");

    el.dispatchEvent(new Event("mouseout"));
    expect(tip.style.display).toBe("block");

    // Test that tooltip hides after hide delay
    vi.advanceTimersByTime(HIDE_DELAY_MS);
    expect(tip.style.display).toBe("none");
  });

  it("supports touch interactions and restores aria descriptions after finger navigation", async () => {
    fetchJson.mockResolvedValue({ ui: { countryFilter: "filter copy" } });

    const { initTooltips } = await import("../../src/helpers/tooltip.js");

    const el = document.createElement("button");
    el.dataset.tooltipId = "ui.countryFilter";
    document.body.appendChild(el);

    await initTooltips();

    const tip = document.querySelector(".tooltip");
    el.dispatchEvent(new Event("touchstart", { bubbles: true }));
    expect(tip.style.display).toBe("block");
    expect(el.getAttribute("aria-describedby")).toContain(tip.id);

    el.dispatchEvent(new Event("touchend", { bubbles: true }));
    vi.runAllTimers();
    expect(tip.style.display).toBe("none");
    expect(el.hasAttribute("aria-describedby")).toBe(false);
  });

  it("dismisses tooltips with Escape and records the user-visible cue", async () => {
    fetchJson.mockResolvedValue({ ui: { clearFilter: "clear copy" } });

    const { initTooltips } = await import("../../src/helpers/tooltip.js");

    const el = document.createElement("button");
    el.dataset.tooltipId = "ui.clearFilter";
    document.body.appendChild(el);

    await initTooltips();

    const tip = document.querySelector(".tooltip");
    el.dispatchEvent(new Event("mouseover"));
    vi.runAllTimers();

    expect(tip.dataset.dismissHint).toContain("Escape");

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(tip.dataset.dismissedBy).toBe("escape");
    expect(tip.style.display).toBe("none");
  });
});

describe("flattenTooltips", () => {
  it("flattens nested objects", async () => {
    const { flattenTooltips } = await import("../../src/helpers/tooltip.js");
    const result = flattenTooltips({ a: { b: "c" }, d: "e" });
    expect(result).toEqual({ "a.b": "c", d: "e" });
  });
});

describe("resolveTooltipText", () => {
  it("warns once and returns fallback when id missing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { resolveTooltipText } = await import("../../src/helpers/tooltip.js");
    const data = {};
    expect(resolveTooltipText(undefined, data)).toBe("More info coming…");
    resolveTooltipText(undefined, data);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
