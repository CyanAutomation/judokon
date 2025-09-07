import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const MULTIPLIER = 10000;
const BASE_DELAY = 300;
const DELAY_RANGE = 401;

/**
 * Computes deterministic reveal delay when test mode is seeded.
 *
 * @pseudocode
 * 1. Multiply Math.sin(1) by MULTIPLIER to create a value with a stable fractional part.
 * 2. Extract the fractional component from the result.
 * 3. Scale the fraction by DELAY_RANGE and floor it to get an offset.
 * 4. Add BASE_DELAY to obtain the expected delay in milliseconds.
 *
 * @returns {number} expected delay in milliseconds
 */
const computeExpectedDelay = () => {
  const x = Math.sin(1) * MULTIPLIER;
  const frac = x - Math.floor(x);
  return BASE_DELAY + Math.floor(frac * DELAY_RANGE);
};

describe("headless mode timing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("schedules round cooldown without delay in headless mode", async () => {
    const { setHeadlessMode } = await import("../../src/helpers/headlessMode.js");
    const { computeNextRoundCooldown } = await import(
      "../../src/helpers/timers/computeNextRoundCooldown.js"
    );
    setHeadlessMode(true);
    const secs = computeNextRoundCooldown();
    expect(secs).toBe(0);
    let elapsed = -1;
    const start = Date.now();
    setTimeout(() => {
      elapsed = Date.now() - start;
    }, secs * 1000);
    await vi.runAllTimersAsync();
    expect(elapsed).toBe(0);
    setHeadlessMode(false);
  });

  it("honors default round cooldown when headless disabled", async () => {
    const { setHeadlessMode } = await import("../../src/helpers/headlessMode.js");
    const { computeNextRoundCooldown } = await import(
      "../../src/helpers/timers/computeNextRoundCooldown.js"
    );
    setHeadlessMode(false);
    const secs = computeNextRoundCooldown();
    expect(secs).toBe(3);
    let elapsed = -1;
    const start = Date.now();
    setTimeout(() => {
      elapsed = Date.now() - start;
    }, secs * 1000);
    await vi.advanceTimersByTimeAsync(secs * 1000 - 1);
    expect(elapsed).toBe(-1);
    await vi.advanceTimersByTimeAsync(1);
    expect(elapsed).toBe(secs * 1000);
  });

  it("reveals opponent immediately in headless mode", async () => {
    const { setHeadlessMode } = await import("../../src/helpers/headlessMode.js");
    const rrMod = await import("../../src/helpers/classicBattle/roundResolver.js");
    vi.spyOn(rrMod, "ensureRoundDecisionState").mockResolvedValue();
    vi.spyOn(rrMod, "finalizeRoundResult").mockResolvedValue({});
    setHeadlessMode(true);
    let elapsed = -1;
    const start = Date.now();
    await rrMod.resolveRound({}, "power", 1, 2).then(() => {
      elapsed = Date.now() - start;
    });
    expect(elapsed).toBe(0);
    setHeadlessMode(false);
  });

  it("uses default reveal delay when headless disabled", async () => {
    const { setHeadlessMode } = await import("../../src/helpers/headlessMode.js");
    const { setTestMode } = await import("../../src/helpers/testModeUtils.js");
    const rrMod = await import("../../src/helpers/classicBattle/roundResolver.js");
    vi.spyOn(rrMod, "ensureRoundDecisionState").mockResolvedValue();
    vi.spyOn(rrMod, "finalizeRoundResult").mockResolvedValue({});
    setHeadlessMode(false);
    setTestMode({ enabled: true, seed: 1 });
    const expectedDelay = computeExpectedDelay();
    let elapsed = -1;
    const start = Date.now();
    const promise = rrMod.resolveRound({}, "power", 1, 2).then(() => {
      elapsed = Date.now() - start;
    });
    await vi.advanceTimersByTimeAsync(expectedDelay - 1);
    expect(elapsed).toBe(-1);
    await vi.advanceTimersByTimeAsync(1);
    await promise;
    expect(elapsed).toBe(expectedDelay);
    setTestMode(false);
  });
});
