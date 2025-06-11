import { describe, it, expect, vi, afterEach } from "vitest";

const originalFetch = global.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  global.fetch = originalFetch;
  vi.resetModules();
});

describe("loadJSON", () => {
  it("throws an error when the response is not ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const { loadJSON } = await import("../../src/helpers/dataUtils.js");
    await expect(loadJSON("/bad.json")).rejects.toThrow("Failed to load /bad.json (HTTP 404)");
  });

  it("throws an error when JSON parsing fails", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: vi.fn().mockRejectedValue(new SyntaxError("bad")) });
    const { loadJSON } = await import("../../src/helpers/dataUtils.js");
    await expect(loadJSON("/bad.json")).rejects.toBeInstanceOf(SyntaxError);
  });

  it("resolves with parsed JSON when the response is ok", async () => {
    const data = { foo: "bar" };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(data) });

    const { loadJSON } = await import("../../src/helpers/dataUtils.js");
    await expect(loadJSON("/good.json")).resolves.toEqual(data);
  });

  it("throws an error when fetch rejects", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network"));
    const { loadJSON } = await import("../../src/helpers/dataUtils.js");
    await expect(loadJSON("/bad.json")).rejects.toThrow("network");
  });

  it("validates data against a schema", async () => {
    const data = { a: "b" };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(data) });
    const schema = { type: "object", properties: { a: { type: "string" } }, required: ["a"] };
    const { loadJSON } = await import("../../src/helpers/dataUtils.js");
    await expect(loadJSON("/schema.json", schema)).resolves.toEqual(data);
  });

  it("throws when schema validation fails", async () => {
    const data = { a: 1 };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(data) });
    const schema = { type: "object", properties: { a: { type: "string" } }, required: ["a"] };
    const { loadJSON } = await import("../../src/helpers/dataUtils.js");
    await expect(loadJSON("/schema.json", schema)).rejects.toThrow("Schema validation failed");
  });
});

describe("fetchDataWithErrorHandling", () => {
  it("throws an error when the response is not ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const { fetchDataWithErrorHandling } = await import("../../src/helpers/dataUtils.js");
    await expect(fetchDataWithErrorHandling("/error.json")).rejects.toThrow(
      "Failed to fetch data from /error.json (HTTP 500)"
    );
  });

  it("throws an error when JSON parsing fails", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: vi.fn().mockRejectedValue(new SyntaxError("fail")) });
    const { fetchDataWithErrorHandling } = await import("../../src/helpers/dataUtils.js");
    await expect(fetchDataWithErrorHandling("/error.json")).rejects.toBeInstanceOf(SyntaxError);
  });

  it("resolves with parsed JSON and caches subsequent calls", async () => {
    const data = { foo: "bar" };
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(data) });
    global.fetch = fetchMock;

    const { fetchDataWithErrorHandling } = await import("../../src/helpers/dataUtils.js");
    const first = await fetchDataWithErrorHandling("/data.json");
    const second = await fetchDataWithErrorHandling("/data.json");

    expect(first).toEqual(data);
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("validates fetched data against a schema", async () => {
    const data = { a: "b" };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(data) });
    const schema = { type: "object", properties: { a: { type: "string" } }, required: ["a"] };
    const { fetchDataWithErrorHandling } = await import("../../src/helpers/dataUtils.js");
    await expect(fetchDataWithErrorHandling("/schema.json", schema)).resolves.toEqual(data);
  });

  it("throws when fetched data fails schema validation", async () => {
    const data = { a: 1 };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(data) });
    const schema = { type: "object", properties: { a: { type: "string" } }, required: ["a"] };
    const { fetchDataWithErrorHandling } = await import("../../src/helpers/dataUtils.js");
    await expect(fetchDataWithErrorHandling("/schema.json", schema)).rejects.toThrow(
      "Schema validation failed"
    );
  });

  it("throws an error when fetch rejects", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("offline"));
    const { fetchDataWithErrorHandling } = await import("../../src/helpers/dataUtils.js");
    await expect(fetchDataWithErrorHandling("/err.json")).rejects.toThrow("offline");
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
    expect(() => validateData(badData, "judoka")).toThrow("Missing fields: country");
  });

  it("accepts valid judoka data", async () => {
    const { validateData } = await import("../../src/helpers/dataUtils.js");
    const goodData = {
      firstname: "A",
      surname: "B",
      country: "X",
      stats: {},
      signatureMoveId: 1
    };
    expect(() => validateData(goodData, "judoka")).not.toThrow();
  });

  it("throws when multiple judoka fields are missing", async () => {
    const { validateData } = await import("../../src/helpers/dataUtils.js");
    const badData = { firstname: "A" };
    expect(() => validateData(badData, "judoka")).toThrow(
      "Missing fields: surname, country, stats, signatureMoveId"
    );
  });

  it("accepts generic object data for other types", async () => {
    const { validateData } = await import("../../src/helpers/dataUtils.js");
    expect(() => validateData({ foo: "bar" }, "other")).not.toThrow();
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
