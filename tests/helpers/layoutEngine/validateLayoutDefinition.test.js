import { describe, expect, it } from "vitest";
import { validateLayoutDefinition } from "../../../src/helpers/layoutEngine/applyLayout.js";

const baseLayout = {
  id: "classic",
  grid: { cols: 10, rows: 6 },
  regions: [
    {
      id: "arena",
      rect: { x: 0, y: 1, width: 6, height: 4 },
    },
  ],
};

describe("validateLayoutDefinition", () => {
  it("returns no errors for a minimal valid layout", () => {
    const { errors } = validateLayoutDefinition(baseLayout);
    expect(errors).toEqual([]);
  });

  it("flags duplicate region ids", () => {
    const layout = {
      ...baseLayout,
      regions: [
        { id: "arena", rect: { x: 0, y: 0, width: 3, height: 3 } },
        { id: "arena", rect: { x: 3, y: 0, width: 3, height: 3 } },
      ],
    };
    const { errors } = validateLayoutDefinition(layout);
    expect(errors).toContain("Layout region id 'arena' is duplicated.");
  });

  it("flags regions that exceed the grid bounds", () => {
    const layout = {
      ...baseLayout,
      regions: [
        {
          id: "scoreboard",
          rect: { x: 8, y: 0, width: 4, height: 2 },
        },
      ],
    };
    const { errors } = validateLayoutDefinition(layout);
    expect(errors).toContain(
      "Layout region 'scoreboard' width exceeds grid bounds (x + width > cols)."
    );
  });

  it("flags invalid visibleIf feature flag values", () => {
    const layout = {
      ...baseLayout,
      regions: [
        {
          id: "scoreboard",
          rect: { x: 0, y: 0, width: 3, height: 2 },
          visibleIf: { featureFlag: "" },
        },
      ],
    };
    const { errors } = validateLayoutDefinition(layout);
    expect(errors).toContain(
      "Layout region 'scoreboard' visibleIf.featureFlag must be a non-empty string."
    );
  });
});
