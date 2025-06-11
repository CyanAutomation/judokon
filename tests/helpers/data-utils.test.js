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
});
