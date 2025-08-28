// @vitest-environment node
import { describe, it, expect, afterEach, vi } from "vitest";
import { CHUNK_SIZE, OVERLAP_RATIO } from "../../src/helpers/vectorSearch/chunkConfig.js";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe("vectorSearch context", () => {
  it("fetches context around an id", async () => {
    const sentence = "Lorem ipsum dolor sit amet. ";
    const md = Array(200).fill(sentence).join("");
    global.fetch = vi.fn().mockResolvedValue({ ok: true, text: async () => md });
    const { fetchContextById, chunkMarkdown } = await import(
      "../../src/helpers/vectorSearch/context.js"
    );
    const result = await fetchContextById("doc.md-chunk-3", 1);
    expect(global.fetch).toHaveBeenCalled();
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
