/**
 * Integration tests for debug logging system integration
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import {
  BattleDebugLogger,
  DEBUG_CATEGORIES,
  LOG_LEVELS,
  logStateTransition,
  logEventEmit,
  logTimerOperation,
  createComponentLogger
} from "../../../src/helpers/classicBattle/debugLogger.js";

describe("Debug Logger Integration", () => {
  let logger;

  beforeEach(() => {
    // Create a test logger instance
    logger = new BattleDebugLogger({ enabled: true, outputMode: "memory" });

    // Spy on console to ensure no violations
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "debug").mockImplementation(() => {});
  });

  describe("Console Discipline", () => {
    it("should not log to console in test environment", () => {
      logStateTransition("from", "to", "trigger");
      logEventEmit("testEvent", { data: "test" });
      logTimerOperation("start", "testTimer", 1000);

      expect(console.log).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.debug).not.toHaveBeenCalled();
    });

    it("should buffer logs in memory during tests", () => {
      logger.log(DEBUG_CATEGORIES.STATE, LOG_LEVELS.INFO, "Test transition");
      logger.log(DEBUG_CATEGORIES.EVENT, LOG_LEVELS.INFO, "Test event");
      logger.log(DEBUG_CATEGORIES.TIMER, LOG_LEVELS.INFO, "Test timer");

      const logs = logger.buffer;
      expect(logs).toHaveLength(3);

      const [stateLogs, eventLogs, timerLogs] = [
        logs.filter((l) => l.category === "state"),
        logs.filter((l) => l.category === "event"),
        logs.filter((l) => l.category === "timer")
      ];

      expect(stateLogs).toHaveLength(1);
      expect(eventLogs).toHaveLength(1);
      expect(timerLogs).toHaveLength(1);
    });

    it("should handle component loggers without console violations", () => {
      const componentLogger = createComponentLogger("TestComponent");

      componentLogger.info("Test message");
      componentLogger.debug("Debug message");
      componentLogger.error("Error message");

      expect(console.log).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.debug).not.toHaveBeenCalled();
    });
  });

  describe("Integration Functionality", () => {
    it("should log state transitions with proper context", () => {
      logger.log(DEBUG_CATEGORIES.STATE, LOG_LEVELS.INFO, "Transition: waiting → active", {
        from: "waiting",
        to: "active",
        trigger: "start",
        roundIndex: 1
      });

      const logs = logger.query({ categories: [DEBUG_CATEGORIES.STATE] });
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        category: "state",
        level: "info",
        message: "Transition: waiting → active",
        data: {
          from: "waiting",
          to: "active",
          trigger: "start",
          roundIndex: 1
        }
      });
    });

    it("should log event emissions with payloads", () => {
      const testPayload = { status: "active", count: 5 };
      logger.log(DEBUG_CATEGORIES.EVENT, LOG_LEVELS.INFO, "Event emitted: battleStart", {
        eventName: "battleStart",
        payload: testPayload
      });

      const logs = logger.query({ categories: [DEBUG_CATEGORIES.EVENT] });
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        category: "event",
        level: "info",
        message: "Event emitted: battleStart",
        data: {
          eventName: "battleStart",
          payload: testPayload
        }
      });
    });

    it("should log timer operations with configuration", () => {
      logger.log(DEBUG_CATEGORIES.TIMER, LOG_LEVELS.INFO, "Timer start: selectionTimer", {
        operation: "start",
        name: "selectionTimer",
        duration: 30000,
        autoSelect: true
      });

      const logs = logger.query({ categories: [DEBUG_CATEGORIES.TIMER] });
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        category: "timer",
        level: "info",
        message: "Timer start: selectionTimer",
        data: {
          operation: "start",
          name: "selectionTimer",
          duration: 30000,
          autoSelect: true
        }
      });
    });

    it("should handle circular references in logged data", () => {
      const circularObj = { name: "test" };
      circularObj.self = circularObj;

      // Should not throw when logging circular references
      expect(() => {
        logger.log(DEBUG_CATEGORIES.STATE, LOG_LEVELS.INFO, "Test circular", {
          circular: circularObj
        });
      }).not.toThrow();

      const logs = logger.buffer;
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe("Test circular");
    });

    it("should query logs by component", () => {
      logger.log(DEBUG_CATEGORIES.STATE, LOG_LEVELS.INFO, "[Orchestrator] State transition");
      logger.log(DEBUG_CATEGORIES.TIMER, LOG_LEVELS.INFO, "[TimerService] Timer started");

      const logs = logger.buffer;
      expect(logs).toHaveLength(2);

      // Should be able to distinguish component sources by message prefix
      const orchestratorLogs = logs.filter((l) => l.message.includes("[Orchestrator]"));
      const timerLogs = logs.filter((l) => l.message.includes("[TimerService]"));

      expect(orchestratorLogs).toHaveLength(1);
      expect(timerLogs).toHaveLength(1);
    });
  });

  describe("Performance Impact", () => {
    it("should have minimal overhead when disabled", () => {
      // Create a disabled logger
      const disabledLogger = new BattleDebugLogger({ enabled: false });

      const startTime = performance.now();

      // Run many logging operations
      for (let i = 0; i < 1000; i++) {
        disabledLogger.log(DEBUG_CATEGORIES.STATE, LOG_LEVELS.INFO, `Message ${i}`, {
          index: i
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete quickly (under 50ms for disabled logger)
      expect(duration).toBeLessThan(50);
    });

    it("should handle high-frequency logging without memory leaks", () => {
      // Log many messages to test buffer management
      for (let i = 0; i < 2000; i++) {
        logger.log(DEBUG_CATEGORIES.EVENT, LOG_LEVELS.INFO, `Event ${i}`, { index: i });
      }

      const logs = logger.buffer;

      // Should respect buffer limits (default 1000)
      expect(logs.length).toBeLessThanOrEqual(1000);

      // Should contain the most recent entries
      const lastLog = logs[logs.length - 1];
      expect(lastLog.data.index).toBeGreaterThan(1000);
    });
  });
});
