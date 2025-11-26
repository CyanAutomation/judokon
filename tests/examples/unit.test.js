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
const { mockFetchHelper, mockStorageHelper, mockLoggerHelper } = vi.hoisted(() => ({
  mockFetchHelper: vi.fn(),
  mockStorageHelper: vi.fn(),
  mockLoggerHelper: vi.fn()
}));

// ===== STEP 2: Declare all mocks at top level (Vitest static analysis phase)
// These are registered before any modules are imported.
vi.mock("../../src/helpers/fetch.js", () => ({
  fetchData: mockFetchHelper
}));

vi.mock("../../src/helpers/storage.js", () => ({
  saveToStorage: mockStorageHelper,
  getFromStorage: vi.fn().mockReturnValue(null)
}));

vi.mock("../../src/helpers/logger.js", () => ({
  logError: mockLoggerHelper
}));

// ===== STEP 3: Organize test data (can use mocks that have no dependencies)
const testData = {
  validResponse: { status: 200, data: { id: 1, name: "Test Item" } },
  errorResponse: { status: 500, error: "Internal Server Error" }
};

// ===== STEP 4: Test suite with setup/teardown
describe("Unit Test Example: Data Processing", () => {
  let harness;

  beforeEach(async () => {
    // Reset all mocks before each test to ensure isolation
    mockFetchHelper.mockReset();
    mockStorageHelper.mockReset();
    mockLoggerHelper.mockReset();

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
  it("processes data successfully when fetch returns 200", async () => {
    // Configure mocks for this specific test
    mockFetchHelper.mockResolvedValue(testData.validResponse);
    mockStorageHelper.mockResolvedValue(true);

    // Import the module AFTER setup() to apply mocks
    const { processData } = await import("../../src/helpers/processData.js");

    // Execute test
    const result = await processData({ id: 1 });

    // Assert
    expect(mockFetchHelper).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    expect(mockStorageHelper).toHaveBeenCalledWith("data", testData.validResponse);
    expect(result).toEqual(testData.validResponse);
  });

  it("logs error and returns null when fetch fails", async () => {
    // Configure mocks for failure scenario
    const error = new Error("Network error");
    mockFetchHelper.mockRejectedValue(error);
    mockLoggerHelper.mockReturnValue(undefined);

    const { processData } = await import("../../src/helpers/processData.js");

    // Execute test
    const result = await processData({ id: 1 });

    // Assert error handling
    expect(mockFetchHelper).toHaveBeenCalled();
    expect(mockLoggerHelper).toHaveBeenCalledWith(
      "Failed to process data",
      expect.objectContaining({ message: "Network error" })
    );
    expect(result).toBeNull();
  });

  it("uses cached data when storage returns existing value", async () => {
    // Configure mocks for cache hit scenario
    const cachedData = { id: 1, cached: true };
    mockStorageHelper.mockResolvedValue(cachedData);

    const { processData } = await import("../../src/helpers/processData.js");

    // Execute test
    const result = await processData({ id: 1 });

    // Assert cache was used (fetch not called)
    expect(mockFetchHelper).not.toHaveBeenCalled();
    expect(result).toEqual(cachedData);
  });

  it("handles edge case: empty input gracefully", async () => {
    const { processData } = await import("../../src/helpers/processData.js");

    // Should not crash with empty input
    const result = await processData({});

    // Expect appropriate handling (either null or error in logger)
    expect(result === null || mockLoggerHelper.mock.calls.length > 0).toBe(true);
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
