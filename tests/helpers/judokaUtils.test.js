import { describe, it, expect, vi, afterEach } from "vitest";
import { withMutedConsole } from "../utils/console.js";
import { resetFallbackCache } from "../../src/helpers/judokaUtils.js";

// Note: We are no longer mocking dataUtils at the module level.
// Instead, we will inject the mock fetch function directly into the function under test.

afterEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  resetFallbackCache();
});

/**
 * Dynamically imports the `getFallbackJudoka` helper from the source module.
 *
 * @returns {Promise<typeof import("../../src/helpers/judokaUtils.js")["getFallbackJudoka"]>}
 * A lazily imported reference to the helper under test.
 * @pseudocode
 * 1. Import the judoka utilities module dynamically for isolation.
 * 2. Return the `getFallbackJudoka` export for the caller to invoke.
 */
async function importGetFallbackJudoka() {
  const mod = await import("../../src/helpers/judokaUtils.js");
  return mod.getFallbackJudoka;
}

/**
 * Executes the provided callback while capturing console.error output safely.
 *
 * @param {() => Promise<unknown>} callback - Function that triggers console.error.
 * @returns {Promise<{result: unknown, errorCalls: unknown[][]}>}
 * @pseudocode
 * 1. Use `withMutedConsole` to silence real error output during execution.
 * 2. Replace `console.error` with a capturing stub that records arguments.
 * 3. Invoke the callback and collect the recorded error calls.
 * 4. Restore `console.error` to the muted implementation provided by the helper.
 */
async function invokeWithConsoleErrorCapture(callback) {
  return withMutedConsole(async () => {
    const errorCalls = [];
    const mutedConsoleError = console.error;
    console.error = (...args) => {
      errorCalls.push(args);
    };
    try {
      const result = await callback();
      return { result, errorCalls };
    } finally {
      console.error = mutedConsoleError;
    }
  }, ["error"]);
}

describe("getFallbackJudoka", () => {
  it("returns the fallback judoka from JSON when available", async () => {
    const fallbackEntry = { id: 0, firstname: "Json", surname: "Fallback" };
    const mockFetch = vi
      .fn()
      .mockResolvedValue([{ id: 1, firstname: "Other", surname: "Judoka" }, fallbackEntry]);

    const getFallbackJudoka = await importGetFallbackJudoka();
    const result = await getFallbackJudoka({ fetchJsonFn: mockFetch });

    expect(result).toEqual(fallbackEntry);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toContain("judoka.json");
  });

  it("caches the fallback judoka after the first successful fetch", async () => {
    const fallbackEntry = { id: 0, firstname: "Cached", surname: "Hero" };
    const mockFetch = vi.fn().mockResolvedValue([fallbackEntry]);

    const getFallbackJudoka = await importGetFallbackJudoka();

    const firstCall = await getFallbackJudoka({ fetchJsonFn: mockFetch });
    const secondCall = await getFallbackJudoka({ fetchJsonFn: mockFetch });

    expect(firstCall).toBe(secondCall);
    expect(firstCall).toEqual(fallbackEntry);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("falls back to the hardcoded judoka and caches the result on error", async () => {
    const error = new Error("network down");
    const mockFetch = vi.fn().mockRejectedValue(error);

    const getFallbackJudoka = await importGetFallbackJudoka();

    const { result: fallback, errorCalls } = await invokeWithConsoleErrorCapture(() =>
      getFallbackJudoka({ fetchJsonFn: mockFetch })
    );

    const cached = await getFallbackJudoka(); // This call should not use the mock

    expect(fallback).toMatchObject({
      id: 0,
      firstname: "Tatsuuma",
      surname: "Ushiyama"
    });
    expect(cached).toBe(fallback);
    expect(mockFetch).toHaveBeenCalledTimes(1); // Only called once before caching the error result
    expect(errorCalls).toEqual([["Failed to load fallback judoka:", error]]);
  });

  it.each([
    {
      name: "falls back when the fallback entry is missing in the fetched data",
      mockData: [{ id: 1, firstname: "Other", surname: "Judoka" }],
      expectedError: "Fallback judoka with id 0 not found"
    },
    {
      name: "falls back when the fetched data is not an array",
      mockData: null,
      expectedError: "Fallback judoka with id 0 not found"
    }
  ])("$name", async ({ mockData, expectedError }) => {
    const mockFetch = vi.fn().mockResolvedValue(mockData);

    const getFallbackJudoka = await importGetFallbackJudoka();

    const { result: fallback, errorCalls } = await invokeWithConsoleErrorCapture(() =>
      getFallbackJudoka({ fetchJsonFn: mockFetch })
    );

    expect(fallback).toMatchObject({
      id: 0,
      firstname: "Tatsuuma",
      surname: "Ushiyama"
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(errorCalls).toHaveLength(1);
    const [, loggedError] = errorCalls[0];
    expect(loggedError).toBeInstanceOf(Error);
    expect(loggedError.message).toBe(expectedError);
  });
});
