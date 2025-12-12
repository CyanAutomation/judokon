import { describe, it, expect, beforeEach, vi } from "vitest";
import { triggerAutoSelect } from "../../playwright/helpers/autoSelectHelper.js";

describe("autoSelectHelper.triggerAutoSelect", () => {
  let mockPage;

  beforeEach(() => {
    mockPage = {
      evaluate: vi.fn()
    };
  });

  describe("success case", () => {
    it("returns {success: true} when Test API returns truthy value", async () => {
      mockPage.evaluate.mockResolvedValue(true);

      const result = await triggerAutoSelect(mockPage);

      expect(result).toEqual({ success: true });
      expect(mockPage.evaluate).toHaveBeenCalledTimes(1);
    });

    it("returns {success: true} when Test API returns truthy non-boolean value", async () => {
      mockPage.evaluate.mockResolvedValue({ triggerResult: "ok" });

      const result = await triggerAutoSelect(mockPage);

      expect(result).toEqual({ success: true });
    });
  });

  describe("API unavailability", () => {
    it("returns {success: false, error} when Test API returns false", async () => {
      mockPage.evaluate.mockResolvedValue(false);

      const result = await triggerAutoSelect(mockPage);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Test API unavailable");
      expect(result.error).toContain("window.__TEST_API?.autoSelect?.triggerAutoSelect");
    });

    it("returns {success: false, error} when Test API returns undefined", async () => {
      mockPage.evaluate.mockResolvedValue(undefined);

      const result = await triggerAutoSelect(mockPage);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Test API unavailable");
    });

    it("returns {success: false, error} when Test API returns null", async () => {
      mockPage.evaluate.mockResolvedValue(null);

      const result = await triggerAutoSelect(mockPage);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Test API unavailable");
    });
  });

  describe("exception handling from browser context", () => {
    it("returns {success: false, error} when page.evaluate throws an Error", async () => {
      mockPage.evaluate.mockRejectedValue(new Error("Network error"));

      const result = await triggerAutoSelect(mockPage);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to trigger auto-select via Test API");
      expect(result.error).toContain("Network error");
    });

    it("returns {success: false, error} when page.evaluate throws a non-Error object", async () => {
      mockPage.evaluate.mockRejectedValue("String error");

      const result = await triggerAutoSelect(mockPage);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to trigger auto-select via Test API");
      expect(result.error).toContain("String error");
    });

    it("returns {success: false, error} when browser context returns error object", async () => {
      mockPage.evaluate.mockResolvedValue({
        _error: true,
        message: "Test API threw: undefined is not an object"
      });

      const result = await triggerAutoSelect(mockPage);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Test API threw an error");
      expect(result.error).toContain("undefined is not an object");
    });
  });

  describe("timeout handling", () => {
    it("uses default timeout of 5000ms when not specified", async () => {
      mockPage.evaluate.mockResolvedValue(true);

      await triggerAutoSelect(mockPage);

      // The withTimeout is internal, so we just verify the call was made
      expect(mockPage.evaluate).toHaveBeenCalled();
    });

    it("uses custom timeout when specified", async () => {
      mockPage.evaluate.mockResolvedValue(true);

      await triggerAutoSelect(mockPage, 10_000);

      expect(mockPage.evaluate).toHaveBeenCalled();
    });

    it("returns {success: false, error} when page.evaluate times out", async () => {
      // Simulate a timeout by having evaluate never resolve
      mockPage.evaluate.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolves
          })
      );

      const result = await triggerAutoSelect(mockPage, 100); // Very short timeout

      expect(result.success).toBe(false);
      expect(result.error).toContain("Auto-select trigger timed out");
    });
  });

  describe("parameter handling", () => {
    it("passes awaitCompletion: true (default) to the Test API", async () => {
      mockPage.evaluate.mockResolvedValue(true);

      await triggerAutoSelect(mockPage);

      // Verify evaluate was called with the function and the default awaitCompletion value
      expect(mockPage.evaluate).toHaveBeenCalled();
      const calls = mockPage.evaluate.mock.calls;
      expect(calls[0]).toHaveLength(2); // function + argument
      expect(calls[0][1]).toBe(true); // awaitCompletion=true
    });

    it("passes awaitCompletion: false when specified", async () => {
      mockPage.evaluate.mockResolvedValue(true);

      await triggerAutoSelect(mockPage, 5000, false);

      const calls = mockPage.evaluate.mock.calls;
      expect(calls[0][1]).toBe(false); // awaitCompletion=false
    });

    it("uses custom timeout with awaitCompletion parameter", async () => {
      mockPage.evaluate.mockResolvedValue(true);

      await triggerAutoSelect(mockPage, 15_000, false);

      expect(mockPage.evaluate).toHaveBeenCalled();
    });

    it("works with all parameter combinations", async () => {
      mockPage.evaluate.mockResolvedValue(true);

      // Only page
      await triggerAutoSelect(mockPage);
      expect(mockPage.evaluate).toHaveBeenCalledTimes(1);

      // Page + timeout
      mockPage.evaluate.mockClear();
      await triggerAutoSelect(mockPage, 3000);
      expect(mockPage.evaluate).toHaveBeenCalledTimes(1);

      // Page + timeout + awaitCompletion
      mockPage.evaluate.mockClear();
      await triggerAutoSelect(mockPage, 7000, false);
      expect(mockPage.evaluate).toHaveBeenCalledTimes(1);

      // Page + timeout + awaitCompletion + debug
      mockPage.evaluate.mockClear();
      await triggerAutoSelect(mockPage, 4000, true, true);
      expect(mockPage.evaluate).toHaveBeenCalledTimes(1);
    });

    it("logs diagnostic information when debug=true on success", async () => {
      mockPage.evaluate.mockResolvedValue(true);
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await triggerAutoSelect(mockPage, 5000, true, true);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[autoSelectHelper]"),
        expect.any(Object)
      );
      consoleSpy.mockRestore();
    });

    it("logs diagnostic information when debug=true on failure", async () => {
      mockPage.evaluate.mockResolvedValue(false);
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await triggerAutoSelect(mockPage, 5000, true, true);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("[autoSelectHelper]"),
        expect.any(Object)
      );
      consoleWarnSpy.mockRestore();
    });

    it("logs diagnostic information when debug=true on exception", async () => {
      mockPage.evaluate.mockRejectedValue(new Error("Network error"));
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await triggerAutoSelect(mockPage, 5000, true, true);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("[autoSelectHelper]"),
        expect.any(Object)
      );
      consoleErrorSpy.mockRestore();
    });

    it("does not log when debug=false (default)", async () => {
      mockPage.evaluate.mockResolvedValue(true);
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await triggerAutoSelect(mockPage);

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("return value structure", () => {
    it("always returns an object with success property", async () => {
      mockPage.evaluate.mockResolvedValue(true);
      const result = await triggerAutoSelect(mockPage);
      expect(result).toHaveProperty("success");
      expect(typeof result.success).toBe("boolean");
    });

    it("includes error property only on failure", async () => {
      mockPage.evaluate.mockResolvedValue(true);
      const successResult = await triggerAutoSelect(mockPage);
      expect(successResult).not.toHaveProperty("error");

      mockPage.evaluate.mockResolvedValue(false);
      const failureResult = await triggerAutoSelect(mockPage);
      expect(failureResult).toHaveProperty("error");
      expect(typeof failureResult.error).toBe("string");
    });
  });
});
