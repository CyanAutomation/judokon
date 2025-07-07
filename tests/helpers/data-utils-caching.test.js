import { afterEach, describe, expect, it, vi } from "vitest";
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
    vi.stubGlobal("fetch", fetchMock);

    const url = "/some.json";
    const first = await fetchDataWithErrorHandling(url);
    const second = await fetchDataWithErrorHandling(url);

    expect(first).toEqual(data);
    expect(second).toEqual(data);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not share cache between different URLs", async () => {
    const data1 = { foo: "bar" };
    const data2 = { baz: "qux" };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(data1) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(data2) });
    vi.stubGlobal("fetch", fetchMock);

    const url1 = "/one.json";
    const url2 = "/two.json";
    const first = await fetchDataWithErrorHandling(url1);
    const second = await fetchDataWithErrorHandling(url2);

    expect(first).toEqual(data1);
    expect(second).toEqual(data2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not cache failed fetches", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, statusText: "fail" })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ foo: "bar" }) });
    vi.stubGlobal("fetch", fetchMock);

    const url = "/fail-then-success.json";
    await expect(fetchDataWithErrorHandling(url)).rejects.toThrow();
    const result = await fetchDataWithErrorHandling(url);
    expect(result).toEqual({ foo: "bar" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  // If cache invalidation is supported, add a test here.
  // If not, add a comment noting this.
});
