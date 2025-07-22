import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  document.body.innerHTML = "";
  vi.resetModules();
});

describe("initTooltips", () => {
  it("shows tooltip on hover and parses markdown", async () => {
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue({
        test: "**Bold**\n_italic_"
      })
    }));

    const { initTooltips } = await import("../../src/helpers/tooltip.js");

    const el = document.createElement("button");
    el.dataset.tooltipId = "test";
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
      fetchJson: vi.fn().mockResolvedValue({ fix: "text" })
    }));

    const { initTooltips } = await import("../../src/helpers/tooltip.js");

    const el = document.createElement("div");
    el.dataset.tooltipId = "fix";
    document.body.appendChild(el);

    await initTooltips();

    const tip = document.querySelector(".tooltip");
    Object.defineProperty(tip, "offsetHeight", { value: 10 });
    el.getBoundingClientRect = () => ({ bottom: 0, left: 0, width: 0, height: 0 });

    el.dispatchEvent(new Event("mouseenter"));

    expect(tip.style.top).toBe(`${window.innerHeight - 10}px`);
    expect(tip.style.left).toBe("0px");
  });
});
