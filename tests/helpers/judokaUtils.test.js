import { describe, it, expect, vi, afterEach } from "vitest";
import { withMutedConsole } from "../utils/console.js";
import {
  importGetFallbackJudoka,
  clearJudokaUtilsModuleCache
} from "../utils/judokaUtilsTestUtils.js";

const mockFetchJson = vi.fn();

vi.mock("../../src/helpers/dataUtils.js", () => ({
  fetchJson: mockFetchJson
}));

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mockFetchJson.mockReset();
  clearJudokaUtilsModuleCache();
});

/**
 * Executes the provided callback while capturing console.error output safely.
 *
 * @param {() => Promise<unknown>} callback - Function that triggers console.error.
 * @returns {Promise<{result: unknown, errorCalls: unknown[][]}>}
 * @pseudocode
 * 1. Spy on `console.error` before muting to intercept calls.
 * 2. Use `withMutedConsole` to silence real output during callback execution.
 * 3. Reassign `console.error` to the spy so calls are still recorded.
 * 4. Invoke the callback and collect the spy's recorded calls.
 * 5. Restore the console to its original implementation.
 */
async function invokeWithConsoleErrorCapture(callback) {
  const consoleErrorSpy = vi.spyOn(console, "error");
  try {
    const result = await withMutedConsole(async () => {
      console.error = consoleErrorSpy;
      return await callback();
    }, ["error"]);
    return { result, errorCalls: [...consoleErrorSpy.mock.calls] };
  } finally {
    consoleErrorSpy.mockRestore();
  }
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

    const { result: fallback, errorCalls } = await invokeWithConsoleErrorCapture(
      () => getFallbackJudoka()
    );

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

  it("falls back when the fallback entry is missing in the fetched data", async () => {
    mockFetchJson.mockResolvedValue([
      { id: 1, firstname: "Other", surname: "Judoka" }
    ]);

    const getFallbackJudoka = await importGetFallbackJudoka();

    const { result: fallback, errorCalls } = await invokeWithConsoleErrorCapture(
      () => getFallbackJudoka()
    );

    expect(fallback).toMatchObject({
      id: 0,
      firstname: "Tatsuuma",
      surname: "Ushiyama"
    });
    expect(mockFetchJson).toHaveBeenCalledTimes(1);
    expect(errorCalls).toHaveLength(1);
    const [, loggedError] = errorCalls[0];
    expect(loggedError).toBeInstanceOf(Error);
    expect(loggedError.message).toBe("Fallback judoka with id 0 not found");
  });

  it("falls back when the fetched data is not an array", async () => {
    mockFetchJson.mockResolvedValue(null);

    const getFallbackJudoka = await importGetFallbackJudoka();

    const { result: fallback, errorCalls } = await invokeWithConsoleErrorCapture(
      () => getFallbackJudoka()
    );

    expect(fallback).toMatchObject({
      id: 0,
      firstname: "Tatsuuma",
      surname: "Ushiyama"
    });
    expect(mockFetchJson).toHaveBeenCalledTimes(1);
    expect(errorCalls).toHaveLength(1);
    const [, loggedError] = errorCalls[0];
    expect(loggedError).toBeInstanceOf(Error);
    expect(loggedError.message).toBe("Fallback judoka with id 0 not found");
  });
});
