import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  document.body.innerHTML = "";
  vi.resetModules();
  vi.doMock("../../src/helpers/settingsUtils.js", () => ({
    loadSettings: vi.fn().mockResolvedValue({ tooltips: true })
  }));
});

describe("initTooltips", () => {
  it("shows tooltip on hover and parses markdown", async () => {
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue({
        stat: { test: "**Bold**\n_italic_" }
      })
    }));

    const { initTooltips } = await import("../../src/helpers/tooltip.js");

    const el = document.createElement("button");
    el.dataset.tooltipId = "stat.test";
    document.body.appendChild(el);

    await initTooltips();

    el.dispatchEvent(new Event("mouseenter"));

    const tip = document.querySelector(".tooltip");
    expect(tip.innerHTML.replace(/\n/g, "")).toBe("<strong>Bold</strong><br><em>italic</em>");
    expect(tip.style.display).toBe("block");

    el.dispatchEvent(new Event("mouseleave"));
    expect(tip.style.display).toBe("none");
  });

  it("warns once for unknown ids", async () => {
    const fetchJson = vi.fn().mockResolvedValue({});
    vi.doMock("../../src/helpers/dataUtils.js", () => ({ fetchJson }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { initTooltips } = await import("../../src/helpers/tooltip.js");

    const el = document.createElement("div");
    el.dataset.tooltipId = "missing";
    document.body.appendChild(el);

    await initTooltips();

    el.dispatchEvent(new Event("mouseenter"));
    el.dispatchEvent(new Event("mouseleave"));
    el.dispatchEvent(new Event("mouseenter"));

    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("positions tooltip within viewport for zero-size targets", async () => {
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue({ stat: { fix: "text" } })
    }));

    const { initTooltips } = await import("../../src/helpers/tooltip.js");

    const el = document.createElement("div");
    el.dataset.tooltipId = "stat.fix";
    document.body.appendChild(el);

    await initTooltips();

    const tip = document.querySelector(".tooltip");
    Object.defineProperty(tip, "offsetHeight", { value: 10 });
    el.getBoundingClientRect = () => ({ bottom: 0, left: 0, width: 0, height: 0 });

    el.dispatchEvent(new Event("mouseenter"));

    expect(tip.style.top).toBe(`${window.innerHeight - 10}px`);
    expect(tip.style.left).toBe("0px");
  });

  it("loads tooltip text for new UI elements", async () => {
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue({
        ui: {
          languageToggle: "toggle",
          next: "next",
          quitMatch: "quit",
          drawCard: "draw"
        }
      })
    }));

    const { initTooltips } = await import("../../src/helpers/tooltip.js");

    const ids = ["ui.languageToggle", "ui.next", "ui.quitMatch", "ui.drawCard"];
    const text = ["toggle", "next", "quit", "draw"];
    const els = ids.map((id) => {
      const el = document.createElement("button");
      el.dataset.tooltipId = id;
      document.body.appendChild(el);
      return el;
    });

    await initTooltips();

    const tip = document.querySelector(".tooltip");
    els.forEach((el, i) => {
      el.dispatchEvent(new Event("mouseenter"));
      expect(tip.textContent).toBe(text[i]);
      el.dispatchEvent(new Event("mouseleave"));
    });
  });

  it("applies overlay class when flag enabled", async () => {
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue({ stat: { test: "text" } })
    }));
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({
      loadSettings: vi.fn().mockResolvedValue({
        tooltips: true,
        featureFlags: { tooltipOverlayDebug: { enabled: true } }
      })
    }));
    const { initTooltips } = await import("../../src/helpers/tooltip.js");
    const el = document.createElement("div");
    el.dataset.tooltipId = "stat.test";
    document.body.appendChild(el);
    await initTooltips();
    expect(document.body.classList.contains("tooltip-overlay-debug")).toBe(true);
  });

  it("does not apply overlay class when flag disabled", async () => {
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue({ stat: { test: "text" } })
    }));
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({
      loadSettings: vi.fn().mockResolvedValue({
        tooltips: true,
        featureFlags: { tooltipOverlayDebug: { enabled: false } }
      })
    }));
    const { initTooltips } = await import("../../src/helpers/tooltip.js");
    const el = document.createElement("div");
    el.dataset.tooltipId = "stat.test";
    document.body.appendChild(el);
    await initTooltips();
    expect(document.body.classList.contains("tooltip-overlay-debug")).toBe(false);
  });
});

describe("flattenTooltips", () => {
  it("flattens nested objects", async () => {
    const { flattenTooltips } = await import("../../src/helpers/tooltip.js");
    const result = flattenTooltips({ a: { b: "c" }, d: "e" });
    expect(result).toEqual({ "a.b": "c", d: "e" });
  });
});
