import { describe, it, expect, vi } from "vitest";

vi.mock("@xenova/transformers", () => ({
  pipeline: vi.fn(async () => async () => ({ data: new Float32Array([0, 0, 0]) }))
}));

const findMatches = vi.hoisted(() => vi.fn(async () => [{ source: "design/doc.md" }]));
vi.mock("../../src/helpers/vectorSearch/index.js", () => ({
  default: { findMatches }
}));

import { evaluate } from "../../scripts/evaluation/evaluateRAG.js";

describe("evaluateRAG", () => {
  it("runs without throwing", async () => {
    await evaluate();
    expect(findMatches).toHaveBeenCalled();
  });
});
