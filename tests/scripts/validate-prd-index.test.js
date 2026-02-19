import { describe, it, expect } from "vitest";
import { validatePrdIndex } from "../../scripts/validate-prd-index.mjs";

describe("validate-prd-index", () => {
  it("ensures all prdIndex.json entries point to existing files", async () => {
    const missing = await validatePrdIndex();
    expect(missing).toEqual([]);
  });
});
