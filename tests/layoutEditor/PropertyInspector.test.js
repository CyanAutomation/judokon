/**
 * PropertyInspector.test.js - Unit tests for PropertyInspector component.
 *
 * @summary Tests form population, updates, and event emission.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PropertyInspector } from "../../src/components/layoutEditor/PropertyInspector.js";

describe("PropertyInspector", () => {
  let inspector, container;

  beforeEach(() => {
    // Create DOM structure
    container = document.createElement("div");
    container.id = "propertyPanel";
    container.innerHTML = `
      <h3>Region Properties</h3>
      <div id="noSelection" class="placeholder">Select a region to edit</div>
      <form id="regionForm" class="hidden">
        <div class="form-group">
          <label>ID</label>
          <input type="text" id="regionId" disabled />
        </div>
        <div class="form-group">
          <label>X (cols)</label>
          <input type="number" id="regionX" min="0" />
        </div>
        <div class="form-group">
          <label>Y (rows)</label>
          <input type="number" id="regionY" min="0" />
        </div>
        <div class="form-group">
          <label>Width (cols)</label>
          <input type="number" id="regionWidth" min="1" />
        </div>
        <div class="form-group">
          <label>Height (rows)</label>
          <input type="number" id="regionHeight" min="1" />
        </div>
        <div class="form-group">
          <label>Z-Index</label>
          <input type="number" id="regionZIndex" />
        </div>
        <div class="form-group">
          <label>Feature Flag (optional)</label>
          <input type="text" id="regionFeatureFlag" />
        </div>
        <button type="submit" class="btn-primary">Apply</button>
        <button type="button" id="deleteRegionBtn" class="btn-danger">Delete Region</button>
      </form>
    `;
    document.body.appendChild(container);

    inspector = new PropertyInspector(container);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("initialization", () => {
    it("should show placeholder and hide form initially", () => {
      const placeholder = container.querySelector("#noSelection");
      const form = container.querySelector("#regionForm");

      expect(placeholder.classList.contains("hidden")).toBe(false);
      expect(form.classList.contains("hidden")).toBe(true);
    });

    it("should initialize with no current region", () => {
      expect(inspector.currentRegionId).toBeNull();
    });
  });

  describe("setRegion", () => {
    it("should populate form with region data", () => {
      const region = {
        id: "arena",
        rect: { x: 10, y: 5, width: 40, height: 14, z: 2 },
        featureFlag: "classicMode"
      };

      inspector.setRegion(region);

      expect(document.getElementById("regionId").value).toBe("arena");
      expect(document.getElementById("regionX").value).toBe("10");
      expect(document.getElementById("regionY").value).toBe("5");
      expect(document.getElementById("regionWidth").value).toBe("40");
      expect(document.getElementById("regionHeight").value).toBe("14");
      expect(document.getElementById("regionZIndex").value).toBe("2");
      expect(document.getElementById("regionFeatureFlag").value).toBe("classicMode");
    });

    it("should show form and hide placeholder when region is set", () => {
      const region = {
        id: "arena",
        rect: { x: 10, y: 5, width: 40, height: 14 }
      };

      inspector.setRegion(region);

      const placeholder = container.querySelector("#noSelection");
      const form = container.querySelector("#regionForm");

      expect(placeholder.classList.contains("hidden")).toBe(true);
      expect(form.classList.contains("hidden")).toBe(false);
    });

    it("should store current region ID", () => {
      const region = {
        id: "arena",
        rect: { x: 10, y: 5, width: 40, height: 14 }
      };

      inspector.setRegion(region);

      expect(inspector.currentRegionId).toBe("arena");
    });

    it("should handle region without featureFlag", () => {
      const region = {
        id: "arena",
        rect: { x: 10, y: 5, width: 40, height: 14 }
      };

      inspector.setRegion(region);

      expect(document.getElementById("regionFeatureFlag").value).toBe("");
    });

    it("should handle region without z-index", () => {
      const region = {
        id: "arena",
        rect: { x: 10, y: 5, width: 40, height: 14 }
      };

      inspector.setRegion(region);

      expect(document.getElementById("regionZIndex").value).toBe("0");
    });

    it("should clear when setRegion called with null", () => {
      const region = {
        id: "arena",
        rect: { x: 10, y: 5, width: 40, height: 14 }
      };

      inspector.setRegion(region);
      expect(inspector.currentRegionId).toBe("arena");

      inspector.setRegion(null);
      expect(inspector.currentRegionId).toBeNull();

      const form = container.querySelector("#regionForm");
      expect(form.classList.contains("hidden")).toBe(true);
    });
  });

  describe("updateValues", () => {
    it("should update form fields with new rect values", () => {
      const region = {
        id: "arena",
        rect: { x: 10, y: 5, width: 40, height: 14 }
      };

      inspector.setRegion(region);

      const newRect = { x: 20, y: 10, width: 30, height: 12 };
      inspector.updateValues(newRect);

      expect(document.getElementById("regionX").value).toBe("20");
      expect(document.getElementById("regionY").value).toBe("10");
      expect(document.getElementById("regionWidth").value).toBe("30");
      expect(document.getElementById("regionHeight").value).toBe("12");
    });
  });

  describe("clear", () => {
    it("should hide form and show placeholder", () => {
      const region = {
        id: "arena",
        rect: { x: 10, y: 5, width: 40, height: 14 }
      };

      inspector.setRegion(region);
      inspector.clear();

      const placeholder = container.querySelector("#noSelection");
      const form = container.querySelector("#regionForm");

      expect(placeholder.classList.contains("hidden")).toBe(false);
      expect(form.classList.contains("hidden")).toBe(true);
    });

    it("should reset current region ID", () => {
      const region = {
        id: "arena",
        rect: { x: 10, y: 5, width: 40, height: 14 }
      };

      inspector.setRegion(region);
      inspector.clear();

      expect(inspector.currentRegionId).toBeNull();
    });

    it("should reset form fields", () => {
      const region = {
        id: "arena",
        rect: { x: 10, y: 5, width: 40, height: 14, z: 2 }
      };

      inspector.setRegion(region);
      inspector.clear();

      expect(document.getElementById("regionX").value).toBe("");
      expect(document.getElementById("regionY").value).toBe("");
      expect(document.getElementById("regionWidth").value).toBe("");
      expect(document.getElementById("regionHeight").value).toBe("");
    });
  });

  describe("form submission", () => {
    it("should emit regionUpdated event with updated values", () => {
      const region = {
        id: "arena",
        rect: { x: 10, y: 5, width: 40, height: 14 }
      };

      inspector.setRegion(region);
      const listener = vi.fn();
      inspector.on("regionUpdated", listener);

      document.getElementById("regionX").value = "20";
      document.getElementById("regionY").value = "10";
      document.getElementById("regionWidth").value = "30";
      document.getElementById("regionHeight").value = "12";
      document.getElementById("regionZIndex").value = "3";

      const form = container.querySelector("#regionForm");
      form.dispatchEvent(new Event("submit"));

      expect(listener).toHaveBeenCalledWith("arena", {
        x: 20,
        y: 10,
        width: 30,
        height: 12,
        z: 3
      });
    });

    it("should emit validationError for negative position", () => {
      const region = {
        id: "arena",
        rect: { x: 10, y: 5, width: 40, height: 14 }
      };

      inspector.setRegion(region);
      const listener = vi.fn();
      inspector.on("validationError", listener);

      document.getElementById("regionX").value = "-1";
      document.getElementById("regionY").value = "5";
      document.getElementById("regionWidth").value = "40";
      document.getElementById("regionHeight").value = "14";

      const form = container.querySelector("#regionForm");
      form.dispatchEvent(new Event("submit"));

      expect(listener).toHaveBeenCalled();
    });

    it("should emit validationError for zero or negative size", () => {
      const region = {
        id: "arena",
        rect: { x: 10, y: 5, width: 40, height: 14 }
      };

      inspector.setRegion(region);
      const listener = vi.fn();
      inspector.on("validationError", listener);

      document.getElementById("regionX").value = "10";
      document.getElementById("regionY").value = "5";
      document.getElementById("regionWidth").value = "0";
      document.getElementById("regionHeight").value = "14";

      const form = container.querySelector("#regionForm");
      form.dispatchEvent(new Event("submit"));

      expect(listener).toHaveBeenCalled();
    });

    it("should not emit event if no region is selected", () => {
      const listener = vi.fn();
      inspector.on("regionUpdated", listener);

      const form = container.querySelector("#regionForm");
      form.dispatchEvent(new Event("submit"));

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("delete button", () => {
    it("should emit regionDeleted event on delete confirmation", () => {
      const region = {
        id: "arena",
        rect: { x: 10, y: 5, width: 40, height: 14 }
      };

      inspector.setRegion(region);
      const listener = vi.fn();
      inspector.on("regionDeleted", listener);

      vi.stubGlobal("confirm", () => true);

      const deleteBtn = container.querySelector("#deleteRegionBtn");
      deleteBtn.click();

      expect(listener).toHaveBeenCalledWith("arena");
    });

    it("should not emit event if delete is cancelled", () => {
      const region = {
        id: "arena",
        rect: { x: 10, y: 5, width: 40, height: 14 }
      };

      inspector.setRegion(region);
      const listener = vi.fn();
      inspector.on("regionDeleted", listener);

      vi.stubGlobal("confirm", () => false);

      const deleteBtn = container.querySelector("#deleteRegionBtn");
      deleteBtn.click();

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("event system", () => {
    it("should support multiple listeners for same event", () => {
      const region = {
        id: "arena",
        rect: { x: 10, y: 5, width: 40, height: 14 }
      };

      inspector.setRegion(region);
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      inspector.on("regionUpdated", listener1);
      inspector.on("regionUpdated", listener2);

      const form = container.querySelector("#regionForm");
      form.dispatchEvent(new Event("submit"));

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });
});
