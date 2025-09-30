import { describe, it, expect, vi, afterEach } from "vitest";
import { withMutedConsole } from "../utils/console.js";

const mockFetchJson = vi.fn();

vi.mock("../../src/helpers/dataUtils.js", () => ({
  fetchJson: mockFetchJson
}));

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mockFetchJson.mockReset();
});

async function importGetFallbackJudoka() {
  const mod = await import("../../src/helpers/judokaUtils.js");
  return mod.getFallbackJudoka;
}

describe("getFallbackJudoka", () => {
  it("returns the fallback judoka from JSON when available", async () => {
    const fallbackEntry = { id: 0, firstname: "Json", surname: "Fallback" };
    mockFetchJson.mockResolvedValue([
      { id: 1, firstname: "Other", surname: "Judoka" },
      fallbackEntry
    ]);

    const getFallbackJudoka = await importGetFallbackJudoka();
    const result = await getFallbackJudoka();

    expect(result).toEqual(fallbackEntry);
    expect(mockFetchJson).toHaveBeenCalledTimes(1);
    expect(mockFetchJson.mock.calls[0][0]).toContain("judoka.json");
  });

  it("caches the fallback judoka after the first successful fetch", async () => {
    const fallbackEntry = { id: 0, firstname: "Cached", surname: "Hero" };
    mockFetchJson.mockResolvedValue([fallbackEntry]);

    const getFallbackJudoka = await importGetFallbackJudoka();

    const firstCall = await getFallbackJudoka();
    const secondCall = await getFallbackJudoka();

    expect(firstCall).toBe(secondCall);
    expect(firstCall).toEqual(fallbackEntry);
    expect(mockFetchJson).toHaveBeenCalledTimes(1);
  });

  it("falls back to the hardcoded judoka and caches the result on error", async () => {
    const error = new Error("network down");
    mockFetchJson.mockRejectedValue(error);

    const getFallbackJudoka = await importGetFallbackJudoka();

    const { result: fallback, errorCalls } = await withMutedConsole(async () => {
      const consoleErrorSpy = vi.spyOn(console, "error");
      try {
        const value = await getFallbackJudoka();
        return { result: value, errorCalls: [...consoleErrorSpy.mock.calls] };
      } finally {
        consoleErrorSpy.mockRestore();
      }
    }, ["error"]);

    mockFetchJson.mockClear();
    const cached = await getFallbackJudoka();

    expect(fallback).toMatchObject({
      id: 0,
      firstname: "Tatsuuma",
      surname: "Ushiyama"
    });
    expect(cached).toBe(fallback);
    expect(mockFetchJson).not.toHaveBeenCalled();
    expect(errorCalls).toEqual([["Failed to load fallback judoka:", error]]);
  });
});
