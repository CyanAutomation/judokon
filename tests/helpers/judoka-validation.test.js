// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  getMissingJudokaFields,
  hasRequiredJudokaFields,
  requiredJudokaFields,
  requiredStatsFields
} from "../../src/helpers/judokaValidation.js";

describe("judokaValidation", () => {
  it("identifies no missing fields", () => {
    const judoka = {
      firstname: "A",
      surname: "B",
      country: "X",
      countryCode: "X",
      stats: { power: 1, speed: 1, technique: 1, kumikata: 1, newaza: 1 },
      weightClass: "-60",
      signatureMoveId: 0,
      rarity: "common"
    };
    expect(getMissingJudokaFields(judoka)).toEqual([]);
    expect(hasRequiredJudokaFields(judoka)).toBe(true);
  });

  it("reports missing fields", () => {
    const judoka = { firstname: "A" };
    const missing = getMissingJudokaFields(judoka);
    expect(missing).toContain("surname");
    expect(hasRequiredJudokaFields(judoka)).toBe(false);
  });

  it("exports field lists", () => {
    expect(Array.isArray(requiredJudokaFields)).toBe(true);
    expect(Array.isArray(requiredStatsFields)).toBe(true);
  });
});
