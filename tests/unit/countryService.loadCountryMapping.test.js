import { describe, expect, it, vi, beforeEach } from "vitest";

const fetchJson = vi.fn();
const importJsonModule = vi.fn();
const getItem = vi.fn();
const setItem = vi.fn();
const debugLog = vi.fn();

vi.mock("../../src/helpers/dataUtils.js", () => ({
  fetchJson,
  importJsonModule
}));

vi.mock("../../src/helpers/storage.js", () => ({
  getItem,
  setItem
}));

vi.mock("../../src/helpers/debug.js", () => ({
  debugLog
}));

describe("loadCountryMapping", () => {
  beforeEach(() => {
    vi.resetModules();
    fetchJson.mockReset();
    importJsonModule.mockReset();
    getItem.mockReset();
    setItem.mockReset();
    debugLog.mockReset();
  });

  it("retries after a failed fetch/import attempt", async () => {
    getItem.mockReturnValue(undefined);

    fetchJson.mockRejectedValueOnce(new Error("network down"));
    importJsonModule.mockRejectedValueOnce(new Error("import fail"));

    const { loadCountryMapping } = await import("../../src/helpers/api/countryService.js");

    await expect(loadCountryMapping()).rejects.toThrow("import fail");

    const mapping = {
      vu: { code: "vu", country: "Vanuatu", active: true }
    };

    fetchJson.mockResolvedValueOnce(mapping);

    const result = await loadCountryMapping();

    expect(result).toEqual(mapping);
    expect(fetchJson).toHaveBeenCalledTimes(2);
    expect(importJsonModule).toHaveBeenCalledTimes(1);
    expect(setItem).toHaveBeenCalledWith("countryCodeMapping", mapping);
    expect(setItem).toHaveBeenCalledTimes(1);
  });
});
