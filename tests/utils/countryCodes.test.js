import { describe, it, expect } from "vitest";
import {
  normalizeCode,
  getCountryByCode,
  getCodeByCountry,
  listCountries,
  toArray
} from "../../src/utils/countryCodes.js";

describe("countryCodes utilities", () => {
  it("normalizes country codes", () => {
    expect(normalizeCode(" JP ")).toBe("jp");
    expect(normalizeCode("br")).toBe("br");
    expect(normalizeCode("invalid")).toBeUndefined();
  });

  it("gets country by code", async () => {
    await expect(getCountryByCode("fr")).resolves.toBe("France");
    await expect(getCountryByCode("zz")).resolves.toBeUndefined();
  });

  it("gets code by country", async () => {
    await expect(getCodeByCountry("Japan")).resolves.toBe("jp");
    await expect(getCodeByCountry("Unknown")).resolves.toBeUndefined();
  });

  it("lists countries alphabetically", async () => {
    const list = await listCountries();
    const sorted = [...list].sort();
    expect(list).toEqual(sorted);
    expect(list).toContain("Japan");
  });

  it("converts mapping to an array of active entries", async () => {
    const arr = await toArray();
    expect(arr.every((e) => e.active)).toBe(true);
    const names = arr.map((e) => e.country);
    expect(names).toEqual([...names].sort());
  });
});
