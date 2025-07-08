// @vitest-environment node
import { describe, it, expect } from "vitest";
import { generateCardCode } from "../../src/helpers/cardCode.js";

const validJudoka = {
  firstname: "Test",
  surname: "User",
  country: "Nowhere",
  countryCode: "NW",
  weightClass: "-90",
  rarity: "common",
  signatureMoveId: 42,
  stats: {
    power: 1,
    speed: 2,
    technique: 3,
    kumikata: 4,
    newaza: 5
  }
};

describe("generateCardCode", () => {
  it("generates a code string for valid judoka", () => {
    const code = generateCardCode(validJudoka);
    expect(typeof code).toBe("string");
    expect(code).toMatch(/^[A-Z0-9]{1,4}(?:-[A-Z0-9]{1,4})*$/);
  });

  it("throws an error when required fields are missing", () => {
    const incomplete = { ...validJudoka };
    delete incomplete.firstname;
    expect(() => generateCardCode(incomplete)).toThrow(/Missing/);
  });

  it("returns the same code for the same input", () => {
    const first = generateCardCode(validJudoka);
    const second = generateCardCode(validJudoka);
    expect(first).toBe(second);
  });

  it("throws if input is not an object", () => {
    expect(() => generateCardCode(null)).toThrow();
    expect(() => generateCardCode(undefined)).toThrow();
    expect(() => generateCardCode(42)).toThrow();
    expect(() => generateCardCode("string")).toThrow();
  });

  it("ignores extra fields in the input", () => {
    const extended = { ...validJudoka, extra: "ignoreme" };
    expect(() => generateCardCode(extended)).not.toThrow();
    const code = generateCardCode(extended);
    expect(typeof code).toBe("string");
  });

  it("produces different codes for different judoka", () => {
    const otherJudoka = { ...validJudoka, firstname: "Other" };
    const code1 = generateCardCode(validJudoka);
    const code2 = generateCardCode(otherJudoka);
    expect(code1).not.toBe(code2);
  });
});
