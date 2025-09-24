import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";

describe("headless mode timing", () => {
  let timers;

  beforeEach(() => {
    vi.resetModules();
    timers = useCanonicalTimers();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    timers.cleanup();
    vi.restoreAllMocks();
  });

  it("returns zero cooldown seconds when headless", async () => {
    const { setHeadlessMode } = await import("../../src/helpers/headlessMode.js");
    const { computeNextRoundCooldown } = await import(
      "../../src/helpers/timers/computeNextRoundCooldown.js"
    );

    setHeadlessMode(true);
    expect(computeNextRoundCooldown()).toBe(0);
    setHeadlessMode(false);
  });

  it("uses default cooldown seconds when headless is disabled", async () => {
    const { setHeadlessMode } = await import("../../src/helpers/headlessMode.js");
    const { computeNextRoundCooldown } = await import(
      "../../src/helpers/timers/computeNextRoundCooldown.js"
    );

    setHeadlessMode(false);
    expect(computeNextRoundCooldown()).toBe(3);
  });

  it("avoids scheduling timers during headless round resolution", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(() => 1);

    const { setHeadlessMode } = await import("../../src/helpers/headlessMode.js");
    const roundResolver = await import("../../src/helpers/classicBattle/roundResolver.js");

    setHeadlessMode(true);
    await roundResolver.resolveRound({}, "power", 1, 2);

    expect(setTimeoutSpy).not.toHaveBeenCalled();
    setHeadlessMode(false);
  });

  it("schedules timers based on resolved delay when not headless", async () => {
    vi.doMock("../../src/helpers/classicBattle/timerUtils.js", async () => {
      const actual = await vi.importActual("../../src/helpers/classicBattle/timerUtils.js");
      return { ...actual, resolveDelay: () => 250 };
    });

    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation((cb, ms) => {
      cb?.();
      return 1;
    });

    const { setHeadlessMode } = await import("../../src/helpers/headlessMode.js");
    const roundResolver = await import("../../src/helpers/classicBattle/roundResolver.js");

    setHeadlessMode(false);
    await roundResolver.resolveRound({}, "power", 1, 2);

    expect(setTimeoutSpy.mock.calls.map(([, ms]) => ms)).toContain(250);
  });
});
