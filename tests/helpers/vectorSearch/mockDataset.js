import { vi } from "vitest";

export const sample = [
  { id: "a", text: "A", embedding: [1, 0], source: "doc1", tags: ["foo"] },
  { id: "b", text: "B", embedding: [0, 1], source: "doc2", tags: ["bar"] }
];

/**
 * Set up mocked embedding dataset for vector search tests.
 *
 * @param {Array} dataset Embeddings to serve from the loader.
 * @returns {Promise<import('vitest').Mock>} fetchJson mock used by the loader.
 */
export async function setupMockDataset(dataset = sample) {
  vi.resetModules();
  const { fetchJson } = await import("../../../src/helpers/dataUtils.js");
  fetchJson.mockReset();
  fetchJson.mockImplementation((url) => {
    if (url.endsWith("client_embeddings.manifest.json")) {
      return Promise.resolve({ shards: ["shard1.json"] });
    }
    if (url.endsWith("shard1.json")) {
      return Promise.resolve(dataset);
    }
    return Promise.resolve([]);
  });
  return fetchJson;
}
