import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchDataWithErrorHandling } from "../../src/helpers/dataUtils.js";

const originalFetch = global.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  global.fetch = originalFetch;
  vi.resetModules();
});

describe("fetchDataWithErrorHandling caching", () => {
  it("reuses cached data on subsequent calls", async () => {
    const data = { foo: "bar" };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(data)
    });
    vi.stubGlobal('fetch', fetchMock);

    const url = "/some.json";
    const first = await fetchDataWithErrorHandling(url);
    const second = await fetchDataWithErrorHandling(url);

    expect(first).toEqual(data);
    expect(second).toEqual(data);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
