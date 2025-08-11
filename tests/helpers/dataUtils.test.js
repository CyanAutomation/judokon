// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe("fetchJson", () => {
  it("throws an error when the response is not ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { fetchJson } = await import("../../src/helpers/dataUtils.js");
    await expect(fetchJson("/error.json")).rejects.toThrow(
      "Failed to fetch /error.json (HTTP 500)"
    );
    errorSpy.mockRestore();
  });

  it("throws an error when JSON parsing fails", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: vi.fn().mockRejectedValue(new SyntaxError("fail")) });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { fetchJson } = await import("../../src/helpers/dataUtils.js");
    await expect(fetchJson("/error.json")).rejects.toBeInstanceOf(SyntaxError);
    errorSpy.mockRestore();
  });

  it("resolves with parsed JSON and caches subsequent calls", async () => {
    const data = { foo: "bar" };
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(data) });
    global.fetch = fetchMock;

    const { fetchJson } = await import("../../src/helpers/dataUtils.js");
    const first = await fetchJson("/data.json");
    const second = await fetchJson("/data.json");

    expect(first).toEqual(data);
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("loads and caches data from file URLs without using fetch", async () => {
    const fileUrl = new URL("../../src/data/statNames.json", import.meta.url).href;
    const fetchMock = vi.fn();
    global.fetch = fetchMock;
    const schema = { type: "array" };
    const { fetchJson } = await import("../../src/helpers/dataUtils.js");
    const first = await fetchJson(fileUrl, schema);
    const second = await fetchJson(fileUrl, schema);
    expect(Array.isArray(first)).toBe(true);
    expect(second).toBe(first);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads local files from relative paths without using fetch", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;
    const { fetchJson } = await import("../../src/helpers/dataUtils.js");
    const data = await fetchJson("src/data/statNames.json");
    expect(Array.isArray(data)).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not share cache between different URLs", async () => {
    const data1 = { foo: "bar" };
    const data2 = { baz: "qux" };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(data1) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(data2) });
    vi.stubGlobal("fetch", fetchMock);

    const { fetchJson } = await import("../../src/helpers/dataUtils.js");
    const url1 = "/one.json";
    const url2 = "/two.json";
    const first = await fetchJson(url1);
    const second = await fetchJson(url2);

    expect(first).toEqual(data1);
    expect(second).toEqual(data2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not cache failed fetches", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, statusText: "fail" })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ foo: "bar" }) });
    global.fetch = fetchMock;

    const { fetchJson } = await import("../../src/helpers/dataUtils.js");
    const url = "/fail-then-success.json";
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(fetchJson(url)).rejects.toThrow();
    errorSpy.mockRestore();
    const result = await fetchJson(url);
    expect(result).toEqual({ foo: "bar" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("validates fetched data against a schema", async () => {
    const data = { a: "b" };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(data) });
    const schema = { type: "object", properties: { a: { type: "string" } }, required: ["a"] };
    const { fetchJson } = await import("../../src/helpers/dataUtils.js");
    await expect(fetchJson("/schema.json", schema)).resolves.toEqual(data);
  });

  it("throws when fetched data fails schema validation", async () => {
    const data = { a: 1 };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(data) });
    const schema = { type: "object", properties: { a: { type: "string" } }, required: ["a"] };
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { fetchJson } = await import("../../src/helpers/dataUtils.js");
    await expect(fetchJson("/schema.json", schema)).rejects.toThrow("Schema validation failed");
    errorSpy.mockRestore();
  });

  it("throws an error when fetch rejects", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("offline"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { fetchJson } = await import("../../src/helpers/dataUtils.js");
    await expect(fetchJson("/err.json")).rejects.toThrow("offline");
    errorSpy.mockRestore();
  });

  it("throws if .json() throws a non-SyntaxError", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockRejectedValue(new Error("not json"))
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { fetchJson } = await import("../../src/helpers/dataUtils.js");
    await expect(fetchJson("/notjson.json")).rejects.toThrow("not json");
    errorSpy.mockRestore();
  });

  it("throws if schema argument is not an object", async () => {
    const data = { foo: "bar" };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(data) });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { fetchJson } = await import("../../src/helpers/dataUtils.js");
    await expect(fetchJson("/good.json", "not-an-object")).rejects.toThrow();
    errorSpy.mockRestore();
  });
});

describe("validateData", () => {
  it("throws for non-object data", async () => {
    const { validateData } = await import("../../src/helpers/dataUtils.js");
    expect(() => validateData(null, "judoka")).toThrow("Invalid or missing judoka data.");
  });

  it("throws when required judoka fields are missing", async () => {
    const { validateData } = await import("../../src/helpers/dataUtils.js");
    const badData = { firstname: "A", surname: "B", stats: {}, signatureMoveId: 1 };
    expect(() => validateData(badData, "judoka")).toThrow(
      "Missing fields: country, countryCode, weightClass, rarity, stats.power, stats.speed, stats.technique, stats.kumikata, stats.newaza"
    );
  });

  it("accepts valid judoka data", async () => {
    const { validateData } = await import("../../src/helpers/dataUtils.js");
    const goodData = {
      firstname: "A",
      surname: "B",
      country: "X",
      countryCode: "X",
      stats: {
        power: 1,
        speed: 1,
        technique: 1,
        kumikata: 1,
        newaza: 1
      },
      weightClass: "-60",
      signatureMoveId: 0,
      rarity: "common"
    };
    expect(() => validateData(goodData, "judoka")).not.toThrow();
  });

  it("throws when multiple judoka fields are missing", async () => {
    const { validateData } = await import("../../src/helpers/dataUtils.js");
    const badData = { firstname: "A" };
    expect(() => validateData(badData, "judoka")).toThrow(
      "Missing fields: surname, country, countryCode, stats, weightClass, signatureMoveId, rarity, stats.power, stats.speed, stats.technique, stats.kumikata, stats.newaza"
    );
  });

  it("accepts generic object data for other types", async () => {
    const { validateData } = await import("../../src/helpers/dataUtils.js");
    expect(() => validateData({ foo: "bar" }, "other")).not.toThrow();
  });

  it("does not throw for unknown type", async () => {
    const { validateData } = await import("../../src/helpers/dataUtils.js");
    expect(() => validateData({ foo: "bar" }, "unknownType")).not.toThrow();
  });
});

describe("validateWithSchema", () => {
  it("throws when data does not match schema", async () => {
    const schema = { type: "object", properties: { a: { type: "string" } }, required: ["a"] };
    const { validateWithSchema } = await import("../../src/helpers/dataUtils.js");
    await expect(validateWithSchema({ a: 1 }, schema)).rejects.toThrow("Schema validation failed");
  });

  it("does not throw when data matches schema", async () => {
    const schema = { type: "object", properties: { a: { type: "string" } }, required: ["a"] };
    const { validateWithSchema } = await import("../../src/helpers/dataUtils.js");
    await expect(validateWithSchema({ a: "b" }, schema)).resolves.toBeUndefined();
  });
});
