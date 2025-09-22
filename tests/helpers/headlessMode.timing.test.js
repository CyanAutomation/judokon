import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";

describe("headless mode timing", () => {
  let timers;
  beforeEach(() => {
    timers = useCanonicalTimers();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    timers.cleanup();
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
    const p = rrMod.resolveRound({}, "power", 1, 2).then(() => {
      elapsed = Date.now() - start;
    });
    await vi.runAllTimersAsync();
    await p;
    expect(elapsed).toBe(0);
    setHeadlessMode(false);
  });

  it("reveals opponent immediately when headless disabled in tests", async () => {
    const { setHeadlessMode } = await import("../../src/helpers/headlessMode.js");
    const rrMod = await import("../../src/helpers/classicBattle/roundResolver.js");
    vi.spyOn(rrMod, "ensureRoundDecisionState").mockResolvedValue();
    vi.spyOn(rrMod, "finalizeRoundResult").mockResolvedValue({});
    setHeadlessMode(false);
    let elapsed = -1;
    const start = Date.now();
    const p = rrMod.resolveRound({}, "power", 1, 2).then(() => {
      elapsed = Date.now() - start;
    });
    await vi.runAllTimersAsync();
    await p;
    expect(elapsed).toBe(0);
  });
});
