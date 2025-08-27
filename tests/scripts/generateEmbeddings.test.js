import { describe, it, expect } from "vitest";
import { extractAllowedValues, normalizeAndFilter } from "../../scripts/generateEmbeddings.js";

// ensure JSON_FIELD_ALLOWLIST includes entries for main data files? Already yes.

describe("extractAllowedValues", () => {
  it("returns only allowlisted fields", () => {
    const item = {
      name: "Power",
      description: "Raw strength",
      category: "Judo",
      extra: "ignored"
    };
    const text = extractAllowedValues("statNames.json", item);
    expect(text).toContain("Power");
    expect(text).toContain("Raw strength");
    expect(text).toContain("Judo");
    expect(text).not.toContain("ignored");
  });
});

describe("normalizeAndFilter", () => {
  it("normalizes text and skips duplicates", () => {
    const seen = new Set();
    const first = normalizeAndFilter("  Hello   World  ", seen);
    const duplicate = normalizeAndFilter("hello world", seen);
    const boiler = normalizeAndFilter("TODO", seen);
    expect(first).toBe("hello world");
    expect(duplicate).toBeUndefined();
    expect(boiler).toBeUndefined();
  });
});
