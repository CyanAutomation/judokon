/**
 * @fileoverview Tests for emitBattleEventAndAwait helper utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { emitBattleEventAndAwait } from "./battleTestUtils.js";
import { useCanonicalTimers } from "../setup/fakeTimers.js";

describe("emitBattleEventAndAwait", () => {
  let timers;
  let mockEmit;
  let handlerCalled;

  beforeEach(() => {
    timers = useCanonicalTimers();
    handlerCalled = false;
    mockEmit = vi.fn(() => {
      // Simulate an async handler being triggered
      setTimeout(() => {
        handlerCalled = true;
      }, 100);
    });
  });

  afterEach(() => {
    timers.cleanup();
  });

  it("emits event and waits for async handlers", async () => {
    await emitBattleEventAndAwait(mockEmit, "testEvent", { data: "test" }, timers);

    expect(mockEmit).toHaveBeenCalledWith("testEvent", { data: "test" });
    expect(handlerCalled).toBe(true);
  });

  it("throws TypeError if emitBattleEvent is not a function", async () => {
    await expect(emitBattleEventAndAwait(null, "testEvent", {}, timers)).rejects.toThrow(TypeError);

    await expect(emitBattleEventAndAwait(null, "testEvent", {}, timers)).rejects.toThrow(
      "emitBattleEvent must be a function"
    );
  });

  it("throws TypeError if timers does not have runAllTimersAsync", async () => {
    await expect(emitBattleEventAndAwait(mockEmit, "testEvent", {}, {})).rejects.toThrow(TypeError);

    await expect(emitBattleEventAndAwait(mockEmit, "testEvent", {}, {})).rejects.toThrow(
      "timers must have a runAllTimersAsync method"
    );
  });

  it("works with undefined detail", async () => {
    await emitBattleEventAndAwait(mockEmit, "testEvent", undefined, timers);

    expect(mockEmit).toHaveBeenCalledWith("testEvent", undefined);
    expect(handlerCalled).toBe(true);
  });
});
