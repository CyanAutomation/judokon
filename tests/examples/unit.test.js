/**
 * @fileoverview Unit Test Template: Top-Level Mocking Pattern (skipped in CI).
 * Template documentation now lives in docs/TESTING_ARCHITECTURE.md.
 * @copyable true
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSimpleHarness } from "../helpers/integrationHarness.js";

// ===== STEP 1: Create shared mocks in vi.hoisted()
// Must be called BEFORE defining any baseSettings or constants that the mocks reference
const { mockFetchJson } = vi.hoisted(() => ({
  mockFetchJson: vi.fn()
}));

// ===== STEP 2: Declare all mocks at top level (Vitest static analysis phase)
// These are registered before any modules are imported.
// We mock the fetch API so we can test the module in isolation
vi.mock("../../src/helpers/dataUtils.js", async () => {
  const actual = await vi.importActual("../../src/helpers/dataUtils.js");
  return {
    ...actual,
    fetchJson: mockFetchJson,
    fetchJudokaList: (options) =>
      actual.fetchJudokaList({
        ...options,
        fetcher: mockFetchJson
      })
  };
});

// ===== STEP 3: Organize test data (can use mocks that have no dependencies)
const testData = {
  normalizedList: [
    {
      id: 7,
      firstname: " Kana ",
      surname: "Yamada",
      country: "Japan",
      countryCode: "JP",
      stats: { power: 5 },
      bio: "Test bio"
    }
  ],
  errorResponse: new Error("API Error")
};

// Template suite intentionally skipped to avoid CI runtime; see docs/TESTING_ARCHITECTURE.md
describe.skip("Unit Test Example: Data Processing (template)", () => {
  let harness;

  beforeEach(async () => {
    // Reset all mocks before each test to ensure isolation
    mockFetchJson.mockReset();

    // Create and setup harness for this test
    harness = createSimpleHarness();
    await harness.setup();
  });

  afterEach(async () => {
    // Always cleanup the harness
    if (harness) {
      await harness.cleanup();
    }
  });

  it("normalizes judoka entries and fills defaults", async () => {
    mockFetchJson.mockResolvedValue(testData.normalizedList);

    const { fetchJudokaList } = await import("../../src/helpers/dataUtils.js");

    const result = await fetchJudokaList({ url: "/data/mock.json" });

    expect(mockFetchJson).toHaveBeenCalledWith("/data/mock.json");
    expect(result).toEqual([
      {
        id: 7,
        firstname: "Kana",
        surname: "Yamada",
        name: "Kana Yamada",
        country: "Japan",
        countryCode: "jp",
        rarity: "Common",
        weightClass: "",
        signatureMoveId: "",
        stats: {
          power: 5,
          speed: 0,
          technique: 0,
          kumikata: 0,
          newaza: 0
        },
        bio: "Test bio"
      }
    ]);
  });

  it("retries failed fetches before succeeding", async () => {
    mockFetchJson
      .mockRejectedValueOnce(testData.errorResponse)
      .mockResolvedValueOnce(testData.normalizedList);

    const { fetchJudokaList } = await import("../../src/helpers/dataUtils.js");

    const result = await fetchJudokaList({ retries: 1, delayMs: 0 });

    expect(mockFetchJson).toHaveBeenCalledTimes(2);
    expect(result[0].countryCode).toBe("jp");
  });

  it("throws after exhausting retries", async () => {
    mockFetchJson.mockRejectedValue(testData.errorResponse);

    const { fetchJudokaList } = await import("../../src/helpers/dataUtils.js");

    await expect(fetchJudokaList({ retries: 1, delayMs: 0 })).rejects.toThrow(
      testData.errorResponse
    );
    expect(mockFetchJson).toHaveBeenCalledTimes(2);
  });
});
