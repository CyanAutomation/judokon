import { describe, it, expect } from "vitest";
import path from "node:path";
import { readdir } from "node:fs/promises";
import {
  JSON_FIELD_ALLOWLIST,
  BOILERPLATE_STRINGS,
  extractAllowedValues,
  normalizeAndFilter
} from "../../scripts/generateEmbeddings.js";

describe("JSON_FIELD_ALLOWLIST", () => {
  it("covers all data JSON files", async () => {
    const dataDir = path.resolve(__dirname, "../../src/data");
    const files = (await readdir(dataDir)).filter(
      (f) =>
        f.endsWith(".json") &&
        !f.startsWith("client_embeddings.") &&
        f !== "aesopsFables.json" &&
        f !== "aesopsMeta.json"
    );
    for (const file of files) {
      expect(JSON_FIELD_ALLOWLIST).toHaveProperty(file);
    }
  });
});

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

  it("returns all fields when allowlist is true", () => {
    const item = { a: "1", b: "2" };
    const text = extractAllowedValues("synonyms.json", item);
    expect(text).toContain("1");
    expect(text).toContain("2");
  });

  it("returns undefined when allowlist is false", () => {
    const item = { a: "1" };
    const text = extractAllowedValues("codeGraphs.json", item);
    expect(text).toBeUndefined();
  });
});

describe("normalizeAndFilter", () => {
  it("normalizes text and skips duplicates and boilerplate", () => {
    const seen = new Set();
    const first = normalizeAndFilter("  Hello   World  ", seen);
    const duplicate = normalizeAndFilter("hello world", seen);
    expect(first).toBe("hello world");
    expect(duplicate).toBeUndefined();
    for (const boiler of BOILERPLATE_STRINGS) {
      expect(normalizeAndFilter(boiler, seen)).toBeUndefined();
    }
  });
});
