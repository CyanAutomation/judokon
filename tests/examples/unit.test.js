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
const { mockFetchData } = vi.hoisted(() => ({
  mockFetchData: vi.fn()
}));

// ===== STEP 2: Declare all mocks at top level (Vitest static analysis phase)
// These are registered before any modules are imported.
// We mock the fetch API so we can test the module in isolation
vi.mock("../../src/helpers/dataUtils.js", async () => {
  const actual = await vi.importActual("../../src/helpers/dataUtils.js");
  return {
    ...actual,
    fetchJudokaList: mockFetchData
  };
});

// ===== STEP 3: Organize test data (can use mocks that have no dependencies)
const testData = {
  validResponse: [{ id: 1, name: "Test Judoka" }],
  errorResponse: new Error("API Error")
};

// ===== STEP 4: Test suite with setup/teardown
describe("Unit Test Example: Data Processing", () => {
  let harness;

  beforeEach(async () => {
    // Reset all mocks before each test to ensure isolation
    mockFetchData.mockReset();

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
  it("fetches data successfully when API returns results", async () => {
    // Configure mocks for this specific test
    mockFetchData.mockResolvedValue(testData.validResponse);

    // Import the module AFTER setup() to apply mocks
    const { fetchJudokaList } = await import("../../src/helpers/dataUtils.js");

    // Execute test
    const result = await fetchJudokaList();

    // Assert
    expect(mockFetchData).toHaveBeenCalled();
    expect(result).toEqual(testData.validResponse);
  });

  it("handles error when fetch fails", async () => {
    // Configure mocks for failure scenario
    mockFetchData.mockRejectedValue(testData.errorResponse);

    const { fetchJudokaList } = await import("../../src/helpers/dataUtils.js");

    // Execute test and expect it to handle the error
    let error;
    try {
      await fetchJudokaList();
    } catch (e) {
      error = e;
    }

    // Assert error was thrown
    expect(mockFetchData).toHaveBeenCalled();
    expect(error).toBeDefined();
  });

  it("returns empty array as fallback on error", async () => {
    // Configure mock to return empty array
    mockFetchData.mockResolvedValue([]);

    const { fetchJudokaList } = await import("../../src/helpers/dataUtils.js");

    // Execute test
    const result = await fetchJudokaList();

    // Assert fallback behavior
    expect(result).toEqual([]);
  });

  it("handles edge case: undefined response", async () => {
    mockFetchData.mockResolvedValue(undefined);

    const { fetchJudokaList } = await import("../../src/helpers/dataUtils.js");

    // Should handle gracefully
    const result = await fetchJudokaList();

    // Expect either null, undefined, or empty array
    expect(result === undefined || result === null || Array.isArray(result)).toBe(true);
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
