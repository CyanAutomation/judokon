import { describe, expect, it, vi, beforeEach, afterAll, beforeAll } from "vitest";
import { applyLayout } from "../../../src/helpers/layoutEngine/applyLayout.js";

function createRoot(html = "") {
  document.body.innerHTML = `<div id="battleRoot">${html}</div>`;
  return document.querySelector("#battleRoot");
}

describe("applyLayout", () => {
  let originalRequestAnimationFrame;

  beforeAll(() => {
    originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  });

  beforeEach(() => {
    globalThis.requestAnimationFrame = undefined;
    document.body.innerHTML = "";
  });

  afterAll(() => {
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
  });

  it("applies region styles using grid percentages", () => {
    const root = createRoot('<div data-layout-id="arena"></div>');
    const layout = {
      id: "test-layout",
      grid: { cols: 10, rows: 20 },
      regions: [
        {
          id: "arena",
          rect: { x: 2, y: 4, width: 5, height: 10 },
          zIndex: 7
        }
      ]
    };
    const logger = { warn: vi.fn(), error: vi.fn() };

    const result = applyLayout(layout, { root, logger });
    const anchor = root.querySelector('[data-layout-id="arena"]');

    expect(result.errors).toEqual([]);
    expect(result.appliedLayoutId).toBe("test-layout");
    expect(result.appliedRegions).toEqual(["arena"]);
    expect(anchor.style.left).toBe("20%");
    expect(anchor.style.top).toBe("20%");
    expect(anchor.style.width).toBe("50%");
    expect(anchor.style.height).toBe("50%");
    expect(anchor.style.zIndex).toBe("7");
    expect(anchor.dataset.layoutRegionId).toBe("arena");
    expect(anchor.getAttribute("data-layout-visibility")).toBe("visible");
    expect(anchor.hasAttribute("hidden")).toBe(false);
    expect(root.dataset.appliedLayoutId).toBe("test-layout");
  });

  it("hides regions behind feature flags when resolver returns false", () => {
    const root = createRoot('<div data-layout-id="scoreboard"></div>');
    const layout = {
      id: "flag-layout",
      grid: { cols: 8, rows: 8 },
      regions: [
        {
          id: "scoreboard",
          rect: { x: 0, y: 0, width: 8, height: 2 },
          visibleIf: { featureFlag: "feature.scoreboard" }
        }
      ]
    };
    const logger = { warn: vi.fn(), error: vi.fn() };
    const resolver = vi.fn().mockReturnValue(false);

    const result = applyLayout(layout, {
      root,
      logger,
      isFeatureFlagEnabled: resolver
    });
    const anchor = root.querySelector('[data-layout-id="scoreboard"]');

    expect(resolver).toHaveBeenCalledWith("feature.scoreboard");
    expect(result.appliedRegions).toEqual([]);
    expect(result.skippedRegions).toEqual(["scoreboard"]);
    expect(anchor.getAttribute("data-layout-visibility")).toBe("hidden");
    expect(anchor.hasAttribute("hidden")).toBe(true);
  });

  it("reports missing anchors and continues processing", () => {
    const root = createRoot('<div data-layout-id="arena"></div>');
    const layout = {
      id: "missing-anchor-layout",
      grid: { cols: 4, rows: 4 },
      regions: [
        {
          id: "arena",
          rect: { x: 0, y: 0, width: 4, height: 4 }
        },
        {
          id: "scoreboard",
          rect: { x: 0, y: 0, width: 2, height: 1 }
        }
      ]
    };
    const logger = { warn: vi.fn(), error: vi.fn() };

    const result = applyLayout(layout, { root, logger });

    expect(result.appliedRegions).toEqual(["arena"]);
    expect(result.missingAnchors).toEqual(["scoreboard"]);
    expect(logger.warn).toHaveBeenCalledWith(
      "layoutEngine.applyLayout: no anchor found for region 'scoreboard'."
    );
  });

  it("logs conflicts when multiple anchors share the same region id", () => {
    const root = createRoot(
      `<div data-layout-id="arena" id="arena-primary"></div><div data-layout-id="arena" id="arena-duplicate"></div>`
    );
    const layout = {
      id: "conflict-layout",
      grid: { cols: 10, rows: 10 },
      regions: [
        {
          id: "arena",
          rect: { x: 0, y: 0, width: 10, height: 10 }
        }
      ]
    };
    const logger = { warn: vi.fn(), error: vi.fn() };

    const result = applyLayout(layout, { root, logger });
    const primaryAnchor = document.getElementById("arena-primary");
    const duplicateAnchor = document.getElementById("arena-duplicate");

    expect(result.conflictingAnchors).toEqual(["arena"]);
    expect(result.appliedRegions).toEqual(["arena"]);
    expect(primaryAnchor.style.width).toBe("100%");
    expect(duplicateAnchor.style.width).toBe("");
    expect(logger.warn).toHaveBeenCalledWith(
      "layoutEngine.applyLayout: multiple anchors found for region 'arena', using the first match."
    );
  });

  it("flags orphaned anchors that are not represented in the layout", () => {
    const root = createRoot(
      `<div data-layout-id="arena"></div><div data-layout-id="unused-region"></div>`
    );
    const layout = {
      id: "orphan-layout",
      grid: { cols: 4, rows: 4 },
      regions: [
        {
          id: "arena",
          rect: { x: 0, y: 0, width: 4, height: 4 }
        }
      ]
    };
    const logger = { warn: vi.fn(), error: vi.fn() };

    const result = applyLayout(layout, { root, logger });

    expect(result.orphanedAnchors).toEqual(["unused-region"]);
    expect(logger.warn).toHaveBeenCalledWith(
      "layoutEngine.applyLayout: anchor 'unused-region' is present in the DOM but missing from the layout definition."
    );
  });

  it("defers DOM mutations until the provided animation frame flush occurs", () => {
    const root = createRoot('<div data-layout-id="arena"></div>');
    const layout = {
      id: "deferred-layout",
      grid: { cols: 10, rows: 10 },
      regions: [
        {
          id: "arena",
          rect: { x: 1, y: 2, width: 5, height: 6 }
        }
      ]
    };
    const logger = { warn: vi.fn(), error: vi.fn() };
    let scheduled;
    const animationFrameProvider = (callback) => {
      scheduled = callback;
    };

    applyLayout(layout, { root, logger, animationFrameProvider });
    const anchor = root.querySelector('[data-layout-id="arena"]');

    expect(anchor.style.left).toBe("");
    expect(typeof scheduled).toBe("function");

    scheduled();

    expect(anchor.style.left).toBe("10%");
    expect(anchor.style.top).toBe("20%");
    expect(anchor.style.width).toBe("50%");
    expect(anchor.style.height).toBe("60%");
  });

  it("returns errors when layout definition is invalid", () => {
    const root = createRoot();
    const layout = { grid: null, regions: [] };
    const logger = { warn: vi.fn(), error: vi.fn() };

    const result = applyLayout(layout, { root, logger });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.appliedRegions).toEqual([]);
    expect(logger.error).toHaveBeenCalled();
  });
});
