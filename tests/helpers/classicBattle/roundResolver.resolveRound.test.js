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

  it("completes immediately when headless disabled in tests", async () => {
    const { mod } = await setup();
    const { setHeadlessMode } = await import("../../../src/helpers/headlessMode.js");
    setHeadlessMode(false);
    let resolved = false;
    await mod.resolveRound({}, "power", 1, 2).then(() => {
      resolved = true;
    });
    expect(resolved).toBe(true);
  });
});
