import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";

vi.mock("../../../src/helpers/BattleEngine.js", () => ({
  handleStatSelection: vi.fn(() => ({
    outcome: "draw",
    playerScore: 0,
    opponentScore: 0,
    matchEnded: false
  }))
}));

async function setup() {
  const mod = await import("../../../src/helpers/classicBattle/roundResolver.js");
  vi.spyOn(mod, "ensureRoundDecisionState").mockResolvedValue();
  vi.spyOn(mod, "finalizeRoundResult").mockResolvedValue({});
  return { mod };
}

describe("resolveRound", () => {
  let timers;
  beforeEach(() => {
    timers = useCanonicalTimers();
    vi.resetModules();
  });

  afterEach(() => {
    timers.cleanup();
    vi.restoreAllMocks();
  });

  it("completes round resolution", async () => {
    const { mod } = await setup();
    let resolved = false;
    const p = mod.resolveRound({}, "power", 1, 2).then(() => {
      resolved = true;
    });
    await vi.runAllTimersAsync();
    await p;
    expect(resolved).toBe(true);
  });

  it("respects provided delay option", async () => {
    const { mod } = await setup();
    const delayMs = 250;
    let resolved = false;
    const p = mod.resolveRound({}, "power", 1, 2, { delayMs }).then(() => {
      resolved = true;
    });
    await vi.runAllTimersAsync();
    await p;
    expect(resolved).toBe(true);
  });
});
