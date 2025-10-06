import { describe, it, expect, vi } from "vitest";
import path from "node:path";
import { readdir } from "node:fs/promises";
import {
  JSON_FIELD_ALLOWLIST,
  BOILERPLATE_STRINGS,
  extractAllowedValues,
  normalizeAndFilter,
  determineTags,
  __jsonTestHelpers
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
      name: "Classic Battle",
      japaneseName: "試合",
      description: "A mode",
      rules: { rounds: 25 },
      extra: "ignored"
    };
    const text = extractAllowedValues("gameModes.json", item);
    expect(text).toContain("Classic Battle");
    expect(text).toContain("試合");
    expect(text).toContain("A mode");
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

describe("determineTags", () => {
  it("tags agent workflow PRDs with agent-workflow", () => {
    const aiWorkflowTags = determineTags(
      "design/productRequirementsDocuments/prdAIAgentWorkflows.md",
      ".md",
      false
    );
    expect(aiWorkflowTags).toContain("prd");
    expect(aiWorkflowTags).toContain("design-doc");
    expect(aiWorkflowTags).toContain("agent-workflow");

    const vectorDbTags = determineTags(
      "design/productRequirementsDocuments/prdVectorDatabaseRAG.md",
      ".md",
      false
    );
    expect(vectorDbTags).toContain("prd");
    expect(vectorDbTags).toContain("design-doc");
    expect(vectorDbTags).toContain("agent-workflow");
  });

  it("excludes agent-workflow for other PRDs", () => {
    const tags = determineTags(
      "design/productRequirementsDocuments/prdDevelopmentStandards.md",
      ".md",
      false
    );
    expect(tags).toContain("design-doc");
    expect(tags).not.toContain("agent-workflow");
  });
});

const { createJsonProcessItem, processJsonArrayEntries, processJsonObjectEntries } =
  __jsonTestHelpers;

describe("JSON processing helpers", () => {
  it("uses overrideText when provided", async () => {
    const extractor = vi.fn(async () => ({ data: [0.123, 0.456] }));
    const writeEntry = vi.fn();
    const extractAllowedValuesFn = vi.fn(() => "should not be used");
    const processItem = createJsonProcessItem({
      base: "gameModes.json",
      relativePath: "src/data/gameModes.json",
      baseTags: ["data"],
      extractor,
      writeEntry,
      seenTexts: new Set(),
      extractAllowedValuesFn
    });

    await processItem({ name: "Classic Battle" }, "item-1", "Allowed Entry.");

    expect(extractor).toHaveBeenCalledWith("allowed entry.", { pooling: "mean" });
    expect(extractAllowedValuesFn).not.toHaveBeenCalled();
    expect(writeEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "gameModes.json-item-1",
        text: "allowed entry.",
        sparseVector: expect.any(Object)
      })
    );
  });

  it("falls back to extractAllowedValues when overrideText is missing", async () => {
    const extractor = vi.fn(async () => [0.321, 0.654]);
    const writeEntry = vi.fn();
    const extractAllowedValuesFn = vi.fn(() => "Rules detail.");
    const processItem = createJsonProcessItem({
      base: "gameModes.json",
      relativePath: "src/data/gameModes.json",
      baseTags: ["data"],
      extractor,
      writeEntry,
      seenTexts: new Set(),
      extractAllowedValuesFn
    });

    await processItem({ rules: { rounds: 3 } }, "item-2");

    expect(extractAllowedValuesFn).toHaveBeenCalledWith("gameModes.json", { rules: { rounds: 3 } });
    expect(writeEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "gameModes.json-item-2",
        text: "rules detail.",
        embedding: [0.321, 0.654]
      })
    );
  });

  it("falls back to extractAllowedValues when overrideText is empty", async () => {
    const extractor = vi.fn(async () => [0.111, 0.222]);
    const writeEntry = vi.fn();
    const extractAllowedValuesFn = vi.fn(() => "From extractor");
    const processItem = createJsonProcessItem({
      base: "gameModes.json",
      relativePath: "src/data/gameModes.json",
      baseTags: ["data"],
      extractor,
      writeEntry,
      seenTexts: new Set(),
      extractAllowedValuesFn
    });

    await processItem({ name: "Classic" }, "item-3", "");

    expect(extractAllowedValuesFn).toHaveBeenCalledWith("gameModes.json", { name: "Classic" });
    expect(writeEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "gameModes.json-item-3",
        text: "from extractor",
        embedding: [0.111, 0.222]
      })
    );
  });

  it("processes array entries with the original item object", async () => {
    const items = [{ name: "Classic" }, { name: "Arcade" }];
    const processItem = vi.fn();
    const extractAllowedValuesFn = vi.fn(() => "allowed");

    await processJsonArrayEntries(items, {
      baseName: "gameModes.json",
      processItem,
      extractAllowedValuesFn
    });

    expect(processItem).toHaveBeenNthCalledWith(1, items[0], "item-1", "allowed");
    expect(processItem).toHaveBeenNthCalledWith(2, items[1], "item-2", "allowed");
  });

  it("skips array entries without allowlisted text", async () => {
    const items = [{ name: "Classic" }, { name: "Arcade" }, { name: "Endless" }];
    const processItem = vi.fn();
    const extractAllowedValuesFn = vi.fn((_, item) => {
      if (item === items[0]) return undefined;
      if (item === items[1]) return "";
      return "Allowed text";
    });

    await processJsonArrayEntries(items, {
      baseName: "gameModes.json",
      processItem,
      extractAllowedValuesFn
    });

    expect(processItem).toHaveBeenCalledTimes(1);
    expect(processItem).toHaveBeenCalledWith(items[2], "item-3", "Allowed text");
  });

  it("processes object key paths with key-specific overrides", async () => {
    const obj = { rules: { rounds: 3 } };
    const processItem = vi.fn();
    const extractAllowedValuesFn = vi.fn(() => "Rounds: 3");

    await processJsonObjectEntries(obj, {
      baseName: "gameModes.json",
      processItem,
      extractAllowedValuesFn
    });

    expect(extractAllowedValuesFn).toHaveBeenCalledWith("gameModes.json", { "rules.rounds": "3" });
    expect(processItem).toHaveBeenCalledWith(
      { "rules.rounds": "3" },
      "rules.rounds",
      "rules.rounds: Rounds: 3"
    );
  });

  it("avoids duplicating the key path when override already includes it", async () => {
    const obj = { rules: { rounds: 3 } };
    const processItem = vi.fn();
    const extractAllowedValuesFn = vi.fn(() => "rules.rounds: Already 3");

    await processJsonObjectEntries(obj, {
      baseName: "gameModes.json",
      processItem,
      extractAllowedValuesFn
    });

    expect(processItem).toHaveBeenCalledWith(
      { "rules.rounds": "3" },
      "rules.rounds",
      "rules.rounds: Already 3"
    );
  });

  it("normalizes overrides missing a space after the key path", async () => {
    const obj = { rules: { rounds: 3 } };
    const processItem = vi.fn();
    const extractAllowedValuesFn = vi.fn(() => "rules.rounds:Already 3");

    await processJsonObjectEntries(obj, {
      baseName: "gameModes.json",
      processItem,
      extractAllowedValuesFn
    });

    expect(processItem).toHaveBeenCalledWith(
      { "rules.rounds": "3" },
      "rules.rounds",
      "rules.rounds: Already 3"
    );
  });
});
