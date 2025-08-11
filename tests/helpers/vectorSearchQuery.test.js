// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../src/helpers/dataUtils.js", () => ({
  fetchJson: vi.fn()
}));

let fetchJsonMock;

beforeEach(async () => {
  vi.resetModules();
  fetchJsonMock = (await import("../../src/helpers/dataUtils.js")).fetchJson;
  fetchJsonMock.mockReset();
});

describe("loadSynonyms", () => {
  it("retries after a transient failure", async () => {
    fetchJsonMock.mockRejectedValueOnce(new Error("fail"));
    fetchJsonMock.mockResolvedValueOnce({ judoka: ["fighter"] });
    const { expandQueryWithSynonyms } = await import("../../src/helpers/vectorSearchQuery.js");
    const first = await expandQueryWithSynonyms("judoka");
    expect(first).toBe("judoka");
    const second = await expandQueryWithSynonyms("judoka");
    expect(second).toBe("judoka fighter");
    expect(fetchJsonMock).toHaveBeenCalledTimes(2);
  });
});
