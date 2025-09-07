import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

async function setup() {
  const mod = await import("../../../src/helpers/classicBattle/roundResolver.js");
  vi.spyOn(mod, "ensureRoundDecisionState").mockResolvedValue();
  vi.spyOn(mod, "finalizeRoundResult").mockResolvedValue({});
  return { mod };
}

describe("resolveRound headless delays", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("completes immediately in headless mode", async () => {
    const { mod } = await setup();
    const { setHeadlessMode } = await import("../../../src/helpers/headlessMode.js");
    setHeadlessMode(true);
    let resolved = false;
    const p = mod.resolveRound({}, "power", 1, 2).then(() => {
      resolved = true;
    });
    await p;
    expect(resolved).toBe(true);
    setHeadlessMode(false);
  });

  it("uses seeded delay when headless disabled", async () => {
    const { mod } = await setup();
    const { setHeadlessMode } = await import("../../../src/helpers/headlessMode.js");
    const { setTestMode } = await import("../../../src/helpers/testModeUtils.js");
    setHeadlessMode(false);
    setTestMode(true);
    let resolved = false;
    const promise = mod.resolveRound({}, "power", 1, 2).then(() => {
      resolved = true;
    });
    await Promise.resolve();
    expect(resolved).toBe(false);
    await vi.runAllTimersAsync();
    await promise;
    expect(resolved).toBe(true);
    setTestMode(false);
  });
});
