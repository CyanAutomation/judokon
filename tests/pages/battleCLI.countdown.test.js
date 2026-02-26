import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

/**
 * Advance fake timers and flush pending async callbacks for deterministic tests.
 *
 * @pseudocode
 * 1. Advance the provided timers by the requested milliseconds.
 * 2. If the timers expose `runOnlyPendingTimersAsync`, await its completion.
 *
 * @param {{ advanceTimersByTimeAsync: Function, runOnlyPendingTimersAsync?: Function }} timers
 *   Fake timers instance returned from `useCanonicalTimers`.
 * @param {number} ms Milliseconds to advance the timers.
 * @returns {Promise<void>} Resolves when timers and pending callbacks finish.
 */
async function advanceTimersAndFlushPending(timers, ms) {
  await timers.advanceTimersByTimeAsync(ms);
  if (typeof timers.runOnlyPendingTimersAsync === "function") {
    await timers.runOnlyPendingTimersAsync();
  }
}

describe("battleCLI countdown", () => {
  let timers;
  beforeEach(() => {
    timers = useCanonicalTimers();
  });

  afterEach(async () => {
    timers.cleanup();
    await cleanupBattleCLI();
  });

  it("does not start a countdown when roundSelect is entered (turn-based mode)", async () => {
    const mod = await loadBattleCLI({ autoSelect: true });
    await mod.init();

    const battleEvents = await import("../../src/helpers/classicBattle/battleEvents.js");
    battleEvents.emitBattleEvent("battleStateChange", { to: "roundSelect" });

    const countdown = document.getElementById("cli-countdown");
    expect(countdown).toBeTruthy();

    // Advance well past the old 30-second timeout — no countdown should be active
    await advanceTimersAndFlushPending(timers, 5000);

    // In turn-based mode the countdown element should remain empty
    expect(countdown.textContent).toBe("");
    expect(countdown.dataset.remainingTime).toBeUndefined();

    // No auto-select should have triggered
    const marker = document.getElementById("auto-select-marker");
    expect(marker?.dataset.triggerCount ?? "0").toBe("0");
  });

  it("does not emit statSelectionStalled automatically in turn-based mode", async () => {
    const mod = await loadBattleCLI({ autoSelect: false });
    await mod.init();

    const battleEvents = await import("../../src/helpers/classicBattle/battleEvents.js");
    const emitSpy = vi.spyOn(battleEvents, "emitBattleEvent");
    battleEvents.emitBattleEvent("battleStateChange", { to: "roundSelect" });

    const countdown = document.getElementById("cli-countdown");
    expect(countdown).toBeTruthy();

    // Advance far beyond old countdown duration without any manual startSelectionCountdown call
    await advanceTimersAndFlushPending(timers, 5000);

    // statSelectionStalled should NOT have been emitted automatically
    const stalledCalls = emitSpy.mock.calls.filter(
      ([eventName]) => eventName === "statSelectionStalled"
    );
    expect(stalledCalls).toHaveLength(0);
    emitSpy.mockRestore();
  });

  it("cli-countdown remains empty in turn-based mode; startSelectionCountdown still functional when called directly", async () => {
    const mod = await loadBattleCLI({ autoSelect: false });
    await mod.init();

    const battleEvents = await import("../../src/helpers/classicBattle/battleEvents.js");
    battleEvents.emitBattleEvent("battleStateChange", { to: "roundSelect" });

    const countdown = document.getElementById("cli-countdown");
    expect(countdown).toBeTruthy();

    // No countdown on state entry (turn-based mode)
    expect(countdown.textContent).toBe("");

    // The exported startSelectionCountdown API is still functional when called directly
    mod.startSelectionCountdown(6);
    expect(countdown.dataset.remainingTime).toBe("6");
    expect(countdown.textContent).toContain("6");
    expect(countdown.style.color).toBe("");

    await timers.advanceTimersByTimeAsync(2000);
    expect(countdown.dataset.remainingTime).toBe("4");
    expect(countdown.style.color).toBe("rgb(255, 204, 0)");

    // Advance remaining time to let countdown expire cleanly
    await advanceTimersAndFlushPending(timers, 4000);
    expect(countdown.textContent).toBe("");
  });

  it("ignores skipRoundCooldown query param in production URL parsing", async () => {
    const mod = await loadBattleCLI({
      autoSelect: true,
      url: "http://localhost/?skipRoundCooldown=1"
    });
    const flagEvents = [];
    mod.featureFlagsEmitter.addEventListener("change", (event) => {
      flagEvents.push(event.detail);
    });

    await mod.init();

    const skipRoundEvents = flagEvents.filter((event) => event.flag === "skipRoundCooldown");
    expect(skipRoundEvents).toHaveLength(0);
  });

  it("falls back to autoSelect when createRoundTimer throws even if cancellation was set", async () => {
    vi.doMock("../../src/helpers/timers/createRoundTimer.js", () => ({
      createRoundTimer: vi.fn(() => {
        throw new Error("timer init failed");
      })
    }));

    const mod = await loadBattleCLI({ autoSelect: true });
    await mod.init();

    mod.startSelectionCountdown(5);
    await advanceTimersAndFlushPending(timers, 0);

    const marker = document.getElementById("auto-select-marker");
    expect(marker?.dataset.triggerCount ?? "0").toBe("1");
  });

  it("emits statSelectionStalled when createRoundTimer throws and autoSelect is disabled", async () => {
    vi.doMock("../../src/helpers/timers/createRoundTimer.js", () => ({
      createRoundTimer: vi.fn(() => {
        throw new Error("timer init failed");
      })
    }));

    const mod = await loadBattleCLI({ autoSelect: false });
    await mod.init();

    const battleEvents = await import("../../src/helpers/classicBattle/battleEvents.js");
    const emitSpy = vi.spyOn(battleEvents, "emitBattleEvent");

    mod.startSelectionCountdown(5);
    await advanceTimersAndFlushPending(timers, 0);

    const stalledCalls = emitSpy.mock.calls.filter(
      ([eventName]) => eventName === "statSelectionStalled"
    );
    expect(stalledCalls).toHaveLength(1);
    emitSpy.mockRestore();
  });

  it("cleans up active countdown state when cli-countdown element is missing", async () => {
    vi.doUnmock("../../src/helpers/timers/createRoundTimer.js");
    const mod = await loadBattleCLI({ autoSelect: false });
    await mod.init();

    const battleEvents = await import("../../src/helpers/classicBattle/battleEvents.js");
    const emitSpy = vi.spyOn(battleEvents, "emitBattleEvent");

    mod.startSelectionCountdown(3);
    const beforeState = mod.getSelectionCountdownState();
    expect(beforeState.selectionTimer).toBeTruthy();
    expect(beforeState.selectionInterval).toBeTruthy();
    expect(beforeState.selectionFinishFn).toBeTypeOf("function");

    const countdown = document.getElementById("cli-countdown");
    countdown?.remove();

    mod.startSelectionCountdown(3);

    const afterState = mod.getSelectionCountdownState();
    expect(afterState.selectionTimer).toBeNull();
    expect(afterState.selectionInterval).toBeNull();
    expect(afterState.selectionFinishFn).toBeNull();
    expect(afterState.selectionTickHandler).toBeNull();
    expect(afterState.selectionExpiredHandler).toBeNull();
    expect(afterState.selectionCancelled).toBe(true);

    await advanceTimersAndFlushPending(timers, 5000);

    const stalledCalls = emitSpy.mock.calls.filter(
      ([eventName]) => eventName === "statSelectionStalled"
    );
    expect(stalledCalls).toHaveLength(0);
    emitSpy.mockRestore();
  });
});
