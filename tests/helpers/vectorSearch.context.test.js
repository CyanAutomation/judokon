// @vitest-environment node
import { describe, it, expect, afterEach, vi } from "vitest";
import { CHUNK_SIZE, OVERLAP_RATIO } from "../../src/helpers/vectorSearch/chunkConfig.js";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("vectorSearch context", () => {
  it("loads context around an id in Node without fetch", async () => {
    const sentence = "Lorem ipsum dolor sit amet. ";
    const md = Array(200).fill(sentence).join("");
    const readFile = vi.fn().mockResolvedValue(md);
    const fileURLToPath = vi.fn(() => "/tmp/doc.md");
    vi.doMock("node:fs/promises", () => ({ readFile }));
    vi.doMock("node:url", () => ({ fileURLToPath }));
    const fetchSpy = vi.spyOn(global, "fetch");
    const { fetchContextById, chunkMarkdown } = await import(
      "../../src/helpers/vectorSearch/context.js"
    );
    const result = await fetchContextById("doc.md-chunk-3", 1);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(readFile).toHaveBeenCalled();
    const expected = chunkMarkdown(md).slice(1, 4);
    expect(result).toEqual(expected);
    for (const chunk of result) {
      expect(chunk.length).toBeLessThanOrEqual(CHUNK_SIZE);
    }
  });

  it("chunks markdown by heading", async () => {
    const md = "## A\nText A\n### B\nText B\n## C\nText C";
    const { chunkMarkdown } = await import("../../src/helpers/vectorSearch/context.js");
    const chunks = chunkMarkdown(md);
    expect(chunks).toEqual(["## A\nText A\n### B\nText B", "### B\nText B", "## C\nText C"]);
  });

  it("respects 1400-char chunks with 15% overlap", async () => {
    const sentence = "Sentence with enough length to test splitting. ";
    const md = Array(120).fill(sentence).join("");
    const { chunkMarkdown } = await import("../../src/helpers/vectorSearch/context.js");
    const chunks = chunkMarkdown(md);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].length).toBeLessThanOrEqual(CHUNK_SIZE);
    expect(chunks[1].length).toBeLessThanOrEqual(CHUNK_SIZE);
    const overlapSize = Math.floor(CHUNK_SIZE * OVERLAP_RATIO);
    const overlap = chunks[0].slice(-overlapSize);
    expect(chunks[1].startsWith(overlap)).toBe(true);
    expect(chunks[0].endsWith(".")).toBe(true);
  });

  it("returns empty array for invalid id", async () => {
    const { fetchContextById } = await import("../../src/helpers/vectorSearch/context.js");
    const res = await fetchContextById("badid");
    expect(res).toEqual([]);
  });
});
