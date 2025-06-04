import { describe, it, expect, vi } from "vitest";
import { fetchDataWithErrorHandling } from "../../helpers/dataUtils.js";

describe("fetchDataWithErrorHandling caching", () => {
  it("reuses cached data on subsequent calls", async () => {
    const data = { foo: "bar" };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(data)
    });
    const originalFetch = global.fetch;
    global.fetch = fetchMock;

    const url = "/some.json";
    const first = await fetchDataWithErrorHandling(url);
    const second = await fetchDataWithErrorHandling(url);

    expect(first).toEqual(data);
    expect(second).toEqual(data);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    global.fetch = originalFetch; // Restore the original fetch
  });
});
