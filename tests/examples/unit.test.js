/**
 * @fileoverview Unit Test Template: Top-Level Mocking Pattern
 *
 * This file demonstrates the modern unit testing pattern for the JU-DO-KON! project.
 * It uses top-level vi.mock() declarations to mock all external dependencies and
 * createSimpleHarness() for environment setup (DOM, timers, fixtures).
 *
 * Key principles:
 * - Mock ALL dependencies (both internal and external)
 * - Use vi.hoisted() to share mock references for per-test configuration
 * - Import modules AFTER harness.setup() to apply mocks
 * - One harness per test (for isolation)
 *
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

// ===== STEP 4: Test suite with setup/teardown
describe("Unit Test Example: Data Processing", () => {
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

  // ===== STEP 5: Write tests with per-test mock configuration
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

/**
 * ===== PATTERN SUMMARY =====
 *
 * MOCK REGISTRATION:
 * 1. vi.hoisted() - Create shared mocks (BEFORE constants)
 * 2. vi.mock() - Register at top level (static phase)
 * 3. Per-test config - Use .mockImplementation(), .mockResolvedValue(), etc.
 *
 * HARNESS SETUP:
 * 1. beforeEach - Create harness, call setup()
 * 2. afterEach - Call cleanup()
 *
 * MODULE IMPORT:
 * - Import modules AFTER harness.setup()
 * - Mocks are applied at import time
 * - Each test gets isolated environment
 *
 * BENEFITS:
 * - All dependencies are mocked (no real side effects)
 * - Tests are fast and deterministic
 * - Easy to understand what is mocked and why
 * - Mocks are visible at file top
 * - Per-test configuration enables flexible scenarios
 *
 * ===== END PATTERN SUMMARY =====
 */
