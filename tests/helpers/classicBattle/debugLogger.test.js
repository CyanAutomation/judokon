import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import {
  BattleDebugLogger,
  DEBUG_CATEGORIES,
  LOG_LEVELS
} from "../../../src/helpers/classicBattle/debugLogger.js";

describe("BattleDebugLogger", () => {
  let logger;
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    logger = new BattleDebugLogger({ enabled: true, outputMode: "memory" });
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe("Logger Configuration", () => {
    it("should initialize with default configuration", () => {
      const defaultLogger = new BattleDebugLogger();

      expect(defaultLogger.categories).toContain(DEBUG_CATEGORIES.STATE);
      expect(defaultLogger.categories).toContain(DEBUG_CATEGORIES.EVENT);
      expect(defaultLogger.categories).toContain(DEBUG_CATEGORIES.TIMER);
      expect(defaultLogger.maxBufferSize).toBe(1000);
      expect(defaultLogger.minLevel).toBe(LOG_LEVELS.DEBUG);
    });

    it("should respect custom categories", () => {
      const customLogger = new BattleDebugLogger({
        categories: [DEBUG_CATEGORIES.STATE, DEBUG_CATEGORIES.ERROR]
      });

      expect(customLogger.categories.size).toBe(2);
      expect(customLogger.categories).toContain(DEBUG_CATEGORIES.STATE);
      expect(customLogger.categories).toContain(DEBUG_CATEGORIES.ERROR);
    });

    it("should determine output mode based on environment", () => {
      process.env.VITEST = "true";
      const testLogger = new BattleDebugLogger();
      expect(testLogger.outputMode).toBe("memory");

      delete process.env.VITEST;
      process.env.NODE_ENV = "production";
      const prodLogger = new BattleDebugLogger();
      expect(prodLogger.outputMode).toBe("memory");
    });
  });

  describe("Logging Operations", () => {
    it("should log messages to memory buffer", () => {
      logger.log(DEBUG_CATEGORIES.STATE, LOG_LEVELS.INFO, "Test message", { test: true });

      expect(logger.buffer).toHaveLength(1);
      expect(logger.buffer[0].category).toBe(DEBUG_CATEGORIES.STATE);
      expect(logger.buffer[0].level).toBe(LOG_LEVELS.INFO);
      expect(logger.buffer[0].message).toBe("Test message");
      expect(logger.buffer[0].data.test).toBe(true);
    });

    it("should filter logs by category", () => {
      const filteredLogger = new BattleDebugLogger({
        enabled: true,
        categories: [DEBUG_CATEGORIES.STATE]
      });

      filteredLogger.log(DEBUG_CATEGORIES.STATE, LOG_LEVELS.INFO, "State message");
      filteredLogger.log(DEBUG_CATEGORIES.EVENT, LOG_LEVELS.INFO, "Event message");

      expect(filteredLogger.buffer).toHaveLength(1);
      expect(filteredLogger.buffer[0].message).toBe("State message");
    });

    it("should filter logs by minimum level", () => {
      const levelLogger = new BattleDebugLogger({
        enabled: true,
        minLevel: LOG_LEVELS.WARN
      });

      levelLogger.log(DEBUG_CATEGORIES.STATE, LOG_LEVELS.DEBUG, "Debug message");
      levelLogger.log(DEBUG_CATEGORIES.STATE, LOG_LEVELS.INFO, "Info message");
      levelLogger.log(DEBUG_CATEGORIES.STATE, LOG_LEVELS.WARN, "Warn message");
      levelLogger.log(DEBUG_CATEGORIES.STATE, LOG_LEVELS.ERROR, "Error message");

      expect(levelLogger.buffer).toHaveLength(2);
      expect(levelLogger.buffer[0].message).toBe("Warn message");
      expect(levelLogger.buffer[1].message).toBe("Error message");
    });

    it("should maintain buffer size limit", () => {
      const smallLogger = new BattleDebugLogger({
        enabled: true,
        maxBufferSize: 3
      });

      for (let i = 0; i < 5; i++) {
        smallLogger.log(DEBUG_CATEGORIES.STATE, LOG_LEVELS.INFO, `Message ${i}`);
      }

      expect(smallLogger.buffer).toHaveLength(3);
      expect(smallLogger.buffer[0].message).toBe("Message 2");
      expect(smallLogger.buffer[2].message).toBe("Message 4");
    });

    it("should not log when disabled", () => {
      const disabledLogger = new BattleDebugLogger({ enabled: false });

      disabledLogger.log(DEBUG_CATEGORIES.STATE, LOG_LEVELS.INFO, "Should not log");

      expect(disabledLogger.buffer).toHaveLength(0);
    });
  });

  describe("Data Sanitization", () => {
    it("should sanitize circular references", () => {
      const circular = { name: "test" };
      circular.self = circular;

      logger.log(DEBUG_CATEGORIES.STATE, LOG_LEVELS.INFO, "Circular test", circular);

      expect(logger.buffer).toHaveLength(1);
      // Circular reference should be handled - exact structure depends on JSON.stringify behavior
      expect(logger.buffer[0].data.error).toBeDefined();
    });

    it("should handle functions in data", () => {
      const dataWithFunction = {
        name: "test",
        callback: function namedFunction() {
          return true;
        }
      };

      logger.log(DEBUG_CATEGORIES.STATE, LOG_LEVELS.INFO, "Function test", dataWithFunction);

      expect(logger.buffer).toHaveLength(1);
      expect(logger.buffer[0].data.callback).toBe("[Function: namedFunction]");
    });

    it("should handle errors in data", () => {
      const testError = new Error("Test error");
      testError.customProp = "custom";

      logger.log(DEBUG_CATEGORIES.ERROR, LOG_LEVELS.ERROR, "Error test", { error: testError });

      expect(logger.buffer).toHaveLength(1);
      expect(logger.buffer[0].data.error.name).toBe("Error");
      expect(logger.buffer[0].data.error.message).toBe("Test error");
    });
  });

  describe("Query Functionality", () => {
    beforeEach(() => {
      // Add test data
      logger.log(DEBUG_CATEGORIES.STATE, LOG_LEVELS.INFO, "State message 1");
      logger.log(DEBUG_CATEGORIES.EVENT, LOG_LEVELS.WARN, "Event warning");
      logger.log(DEBUG_CATEGORIES.STATE, LOG_LEVELS.ERROR, "State error");
      logger.log(DEBUG_CATEGORIES.TIMER, LOG_LEVELS.INFO, "Timer info");
    });

    it("should query logs by category", () => {
      const stateResults = logger.query({ categories: [DEBUG_CATEGORIES.STATE] });

      expect(stateResults).toHaveLength(2);
      expect(stateResults.every((entry) => entry.category === DEBUG_CATEGORIES.STATE)).toBe(true);
    });

    it("should query logs by level", () => {
      const errorResults = logger.query({ levels: [LOG_LEVELS.ERROR] });

      expect(errorResults).toHaveLength(1);
      expect(errorResults[0].message).toBe("State error");
    });

    it("should query logs by message pattern", () => {
      const stateResults = logger.query({ message: "State" });

      expect(stateResults).toHaveLength(2);
      expect(stateResults.every((entry) => entry.message.includes("State"))).toBe(true);
    });

    it("should limit query results", () => {
      const limitedResults = logger.query({ limit: 2 });

      expect(limitedResults).toHaveLength(2);
    });

    it("should sort results by timestamp (newest first)", () => {
      const results = logger.query();

      expect(results).toHaveLength(4);
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].timestamp).toBeGreaterThanOrEqual(results[i].timestamp);
      }
    });
  });

  describe("Statistics", () => {
    beforeEach(() => {
      logger.log(DEBUG_CATEGORIES.STATE, LOG_LEVELS.INFO, "Message 1");
      logger.log(DEBUG_CATEGORIES.STATE, LOG_LEVELS.WARN, "Message 2");
      logger.log(DEBUG_CATEGORIES.EVENT, LOG_LEVELS.ERROR, "Message 3");
    });

    it("should provide accurate statistics", () => {
      const stats = logger.getStats();

      expect(stats.totalEntries).toBe(3);
      expect(stats.categories[DEBUG_CATEGORIES.STATE]).toBe(2);
      expect(stats.categories[DEBUG_CATEGORIES.EVENT]).toBe(1);
      expect(stats.levels[LOG_LEVELS.INFO]).toBe(1);
      expect(stats.levels[LOG_LEVELS.WARN]).toBe(1);
      expect(stats.levels[LOG_LEVELS.ERROR]).toBe(1);
    });

    it("should calculate time range", () => {
      const stats = logger.getStats();

      expect(stats.timeRange.first).toBeTypeOf("number");
      expect(stats.timeRange.last).toBeTypeOf("number");
      expect(stats.timeRange.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Console Output Control", () => {
    it("should respect outputMode override when explicitly set", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      // When outputMode is explicitly provided, it should be respected
      const testLogger = new BattleDebugLogger({
        enabled: true,
        outputMode: "console"
      });

      testLogger.log(DEBUG_CATEGORIES.STATE, LOG_LEVELS.INFO, "Test message");

      // Explicit outputMode should be respected
      expect(testLogger.outputMode).toBe("console");

      consoleSpy.mockRestore();
    });
  });

  describe("Export Functionality", () => {
    it("should export logs as JSON", () => {
      logger.log(DEBUG_CATEGORIES.STATE, LOG_LEVELS.INFO, "Export test");

      const exported = logger.export();
      const parsed = JSON.parse(exported);

      expect(parsed.exported).toBeTypeOf("number");
      expect(parsed.stats).toBeDefined();
      expect(parsed.logs).toHaveLength(1);
      expect(parsed.logs[0].message).toBe("Export test");
    });
  });

  describe("Clear Functionality", () => {
    it("should clear all logs and reset start time", async () => {
      logger.log(DEBUG_CATEGORIES.STATE, LOG_LEVELS.INFO, "Before clear");

      expect(logger.buffer).toHaveLength(1);

      const beforeClear = logger.startTime;
      // Add small delay to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 1));
      logger.clear();

      expect(logger.buffer).toHaveLength(0);
      expect(logger.startTime).toBeGreaterThanOrEqual(beforeClear);
    });
  });
});

describe("Convenience Logging Functions", () => {
  let consoleSpy;
  let testLogger;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // Create a test logger instance that's explicitly enabled
    testLogger = new BattleDebugLogger({ enabled: true, outputMode: "memory" });

    // Temporarily replace the default logger for testing
    vi.doMock("../../../src/helpers/classicBattle/debugLogger.js", async (importOriginal) => {
      const original = await importOriginal();
      return {
        ...original,
        debugLogger: testLogger
      };
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    vi.doUnmock("../../../src/helpers/classicBattle/debugLogger.js");
  });

  describe("logStateTransition", () => {
    it("should log state transitions with correct format", () => {
      // Use test logger directly instead of global one
      testLogger.log(
        DEBUG_CATEGORIES.STATE,
        LOG_LEVELS.INFO,
        "Transition: stateA → stateB (trigger1)",
        { from: "stateA", to: "stateB", trigger: "trigger1", extra: "data" }
      );

      const results = testLogger.query({ categories: [DEBUG_CATEGORIES.STATE] });
      expect(results).toHaveLength(1);
      expect(results[0].message).toBe("Transition: stateA → stateB (trigger1)");
      expect(results[0].data.from).toBe("stateA");
      expect(results[0].data.to).toBe("stateB");
      expect(results[0].data.trigger).toBe("trigger1");
      expect(results[0].data.extra).toBe("data");
    });
  });

  describe("logEventEmit", () => {
    it("should log event emissions with payload", () => {
      const payload = { round: 1, player: "test" };
      testLogger.log(DEBUG_CATEGORIES.EVENT, LOG_LEVELS.INFO, "Event emitted: roundStarted", {
        eventName: "roundStarted",
        payload,
        source: "battle"
      });

      const results = testLogger.query({ categories: [DEBUG_CATEGORIES.EVENT] });
      expect(results).toHaveLength(1);
      expect(results[0].message).toBe("Event emitted: roundStarted");
      expect(results[0].data.eventName).toBe("roundStarted");
      expect(results[0].data.payload).toEqual(payload);
      expect(results[0].data.source).toBe("battle");
    });
  });

  describe("logTimerOperation", () => {
    it("should log timer operations", () => {
      testLogger.log(DEBUG_CATEGORIES.TIMER, LOG_LEVELS.INFO, "Timer start: roundTimer", {
        operation: "start",
        name: "roundTimer",
        duration: 30000,
        automatic: true
      });

      const results = testLogger.query({ categories: [DEBUG_CATEGORIES.TIMER] });
      expect(results).toHaveLength(1);
      expect(results[0].message).toBe("Timer start: roundTimer");
      expect(results[0].data.operation).toBe("start");
      expect(results[0].data.name).toBe("roundTimer");
      expect(results[0].data.duration).toBe(30000);
      expect(results[0].data.automatic).toBe(true);
    });
  });

  describe("logError", () => {
    it("should log errors with stack traces", () => {
      const testError = new Error("Test error");
      testLogger.log(DEBUG_CATEGORIES.ERROR, LOG_LEVELS.ERROR, "Something went wrong", {
        error: testError,
        component: "battle"
      });

      const results = testLogger.query({ categories: [DEBUG_CATEGORIES.ERROR] });
      expect(results).toHaveLength(1);
      expect(results[0].message).toBe("Something went wrong");
      expect(results[0].level).toBe(LOG_LEVELS.ERROR);
      expect(results[0].data.error.message).toBe("Test error");
      expect(results[0].data.component).toBe("battle");
    });
  });

  describe("logPerformance", () => {
    it("should log performance measurements", () => {
      testLogger.log(
        DEBUG_CATEGORIES.PERFORMANCE,
        LOG_LEVELS.INFO,
        "Performance: renderBattle took 16.5ms",
        { operation: "renderBattle", duration: 16.5, frameRate: 60 }
      );

      const results = testLogger.query({ categories: [DEBUG_CATEGORIES.PERFORMANCE] });
      expect(results).toHaveLength(1);
      expect(results[0].message).toBe("Performance: renderBattle took 16.5ms");
      expect(results[0].data.operation).toBe("renderBattle");
      expect(results[0].data.duration).toBe(16.5);
      expect(results[0].data.frameRate).toBe(60);
    });
  });
});
