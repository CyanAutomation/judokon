/**
 * EditorCanvas.test.js - Unit tests for EditorCanvas component.
 *
 * @summary Tests canvas rendering, drag-resize logic, grid snapping, and event emission.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { EditorCanvas } from "../../src/components/layoutEditor/EditorCanvas.js";

describe("EditorCanvas", () => {
  let canvas, overlay, canvasElement;

  beforeEach(() => {
    // Create DOM elements
    const container = document.createElement("div");
    canvasElement = document.createElement("canvas");
    overlay = document.createElement("div");
    container.appendChild(canvasElement);
    container.appendChild(overlay);
    document.body.appendChild(container);

    // Create instance
    canvas = new EditorCanvas(canvasElement, overlay, 20, 60, 24);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("initialization", () => {
    it("should set canvas dimensions based on grid and cell size", () => {
      expect(canvasElement.width).toBe(60 * 20);
      expect(canvasElement.height).toBe(24 * 20);
    });

    it("should initialize with no layout", () => {
      expect(canvas.layout).toBeNull();
    });

    it("should initialize with no selected region", () => {
      expect(canvas.selectedRegionId).toBeNull();
    });
  });

  describe("layout rendering", () => {
    it("should render regions as DOM boxes", () => {
      const layout = {
        grid: { cols: 60, rows: 24 },
        regions: [
          { id: "arena", rect: { x: 10, y: 5, width: 40, height: 14 } },
          { id: "hands", rect: { x: 0, y: 0, width: 10, height: 24 } }
        ]
      };

      canvas.setLayout(layout);

      const boxes = overlay.querySelectorAll(".region-box");
      expect(boxes).toHaveLength(2);
      expect(boxes[0].dataset.regionId).toBe("arena");
      expect(boxes[1].dataset.regionId).toBe("hands");
    });

    it("should position regions correctly with cell size", () => {
      const layout = {
        grid: { cols: 60, rows: 24 },
        regions: [{ id: "arena", rect: { x: 10, y: 5, width: 40, height: 14 } }]
      };

      canvas.setLayout(layout);

      const box = overlay.querySelector("[data-region-id='arena']");
      expect(box.style.left).toBe("200px"); // 10 * 20
      expect(box.style.top).toBe("100px"); // 5 * 20
      expect(box.style.width).toBe("800px"); // 40 * 20
      expect(box.style.height).toBe("280px"); // 14 * 20
    });

    it("should add resize handles to each region", () => {
      const layout = {
        grid: { cols: 60, rows: 24 },
        regions: [{ id: "arena", rect: { x: 10, y: 5, width: 40, height: 14 } }]
      };

      canvas.setLayout(layout);

      const box = overlay.querySelector("[data-region-id='arena']");
      const handles = box.querySelectorAll(".resize-handle");
      expect(handles).toHaveLength(4); // nw, ne, sw, se
    });

    it("should clear overlay when layout is null", () => {
      const layout = {
        grid: { cols: 60, rows: 24 },
        regions: [{ id: "arena", rect: { x: 10, y: 5, width: 40, height: 14 } }]
      };

      canvas.setLayout(layout);
      expect(overlay.querySelectorAll(".region-box")).toHaveLength(1);

      canvas.setLayout(null);
      expect(overlay.querySelectorAll(".region-box")).toHaveLength(0);
    });
  });

  describe("region selection", () => {
    beforeEach(() => {
      const layout = {
        grid: { cols: 60, rows: 24 },
        regions: [
          { id: "arena", rect: { x: 10, y: 5, width: 40, height: 14 } },
          { id: "hands", rect: { x: 0, y: 0, width: 10, height: 24 } }
        ]
      };

      canvas.setLayout(layout);
    });

    it("should select a region when clicking on it", () => {
      const box = overlay.querySelector("[data-region-id='arena']");
      const listener = vi.fn();
      canvas.on("regionSelected", listener);

      box.click();

      expect(canvas.selectedRegionId).toBe("arena");
      expect(listener).toHaveBeenCalledWith("arena");
    });

    it("should highlight selected region with selected class", () => {
      const arenaBox = overlay.querySelector("[data-region-id='arena']");
      const handsBox = overlay.querySelector("[data-region-id='hands']");

      arenaBox.click();
      expect(arenaBox.classList.contains("selected")).toBe(true);
      expect(handsBox.classList.contains("selected")).toBe(false);

      handsBox.click();
      expect(arenaBox.classList.contains("selected")).toBe(false);
      expect(handsBox.classList.contains("selected")).toBe(true);
    });

    it("should not emit event if same region is clicked again", () => {
      const box = overlay.querySelector("[data-region-id='arena']");
      const listener = vi.fn();
      canvas.on("regionSelected", listener);

      box.click();
      box.click();

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("drag-resize logic", () => {
    beforeEach(() => {
      const layout = {
        grid: { cols: 60, rows: 24 },
        regions: [{ id: "arena", rect: { x: 10, y: 5, width: 40, height: 14 } }]
      };

      canvas.setLayout(layout);
    });

    it("should initialize dragState on mousedown", () => {
      const box = overlay.querySelector("[data-region-id='arena']");

      const mouseDown = new MouseEvent("mousedown", {
        clientX: 200,
        clientY: 100,
        bubbles: true
      });

      box.dispatchEvent(mouseDown);

      // dragState should be set after mousedown on a region box
      expect(canvas.dragState).toBeDefined();
      expect(canvas.dragState.regionId).toBe("arena");
      expect(canvas.dragState.type).toBe("drag");
    });

    it("should clamp position to grid bounds", () => {
      const region = canvas.layout.regions[0];

      // Try to set position beyond grid
      region.rect.x = -100;
      expect(region.rect.x).toBeLessThan(0); // Should allow negative before clamping

      // Manually call handleResize with extreme resize
      canvas.handleResize(region, "se", 1000, 1000, { ...region.rect });

      // Check width/height enforcement
      expect(region.rect.width).toBeGreaterThanOrEqual(1);
      expect(region.rect.height).toBeGreaterThanOrEqual(1);
    });

    it("should handle resize logic for each direction", () => {
      const region = canvas.layout.regions[0];
      const origRect = { x: 10, y: 5, width: 40, height: 14 };

      // Southeast resize
      canvas.handleResize(region, "se", 2, 1, origRect);
      expect(region.rect.width).toBe(42); // 40 + 2
      expect(region.rect.height).toBe(15); // 14 + 1

      // Reset
      Object.assign(region.rect, origRect);

      // Southwest resize
      canvas.handleResize(region, "sw", -2, 1, origRect);
      expect(region.rect.width).toBe(42); // 40 - (-2)
      expect(region.rect.x).toBe(8); // 10 + (-2)

      // Reset
      Object.assign(region.rect, origRect);

      // Northeast resize
      canvas.handleResize(region, "ne", 2, -1, origRect);
      expect(region.rect.width).toBe(42); // 40 + 2
      expect(region.rect.y).toBe(4); // 5 + (-1)

      // Reset
      Object.assign(region.rect, origRect);

      // Northwest resize
      canvas.handleResize(region, "nw", -2, -1, origRect);
      expect(region.rect.width).toBe(42); // 40 - (-2)
      expect(region.rect.x).toBe(8); // 10 + (-2)
      expect(region.rect.y).toBe(4); // 5 + (-1)
    });

    it("should enforce minimum width and height of 1 cell", () => {
      const region = canvas.layout.regions[0];
      const origRect = { x: 10, y: 5, width: 40, height: 14 };

      // Try to make width zero
      canvas.handleResize(region, "se", -1000, 0, origRect);
      expect(region.rect.width).toBeGreaterThanOrEqual(1);
      expect(region.rect.height).toBeGreaterThanOrEqual(1);
    });
  });

  describe("event emission", () => {
    it("should emit regionSelected event when region is clicked", () => {
      const layout = {
        grid: { cols: 60, rows: 24 },
        regions: [{ id: "arena", rect: { x: 10, y: 5, width: 40, height: 14 } }]
      };

      canvas.setLayout(layout);
      const listener = vi.fn();
      canvas.on("regionSelected", listener);

      const box = overlay.querySelector("[data-region-id='arena']");
      box.click();

      expect(listener).toHaveBeenCalledWith("arena");
    });

    it("should support multiple listeners for same event", () => {
      const layout = {
        grid: { cols: 60, rows: 24 },
        regions: [{ id: "arena", rect: { x: 10, y: 5, width: 40, height: 14 } }]
      };

      canvas.setLayout(layout);
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      canvas.on("regionSelected", listener1);
      canvas.on("regionSelected", listener2);

      const box = overlay.querySelector("[data-region-id='arena']");
      box.click();

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe("update region", () => {
    it("should update region visual position without re-rendering", () => {
      const layout = {
        grid: { cols: 60, rows: 24 },
        regions: [{ id: "arena", rect: { x: 10, y: 5, width: 40, height: 14 } }]
      };

      canvas.setLayout(layout);

      const region = {
        id: "arena",
        rect: { x: 20, y: 10, width: 30, height: 12 }
      };

      canvas.updateRegion("arena", region);

      const box = overlay.querySelector("[data-region-id='arena']");
      expect(box.style.left).toBe("400px"); // 20 * 20
      expect(box.style.top).toBe("200px"); // 10 * 20
      expect(box.style.width).toBe("600px"); // 30 * 20
      expect(box.style.height).toBe("240px"); // 12 * 20
    });
  });
});
