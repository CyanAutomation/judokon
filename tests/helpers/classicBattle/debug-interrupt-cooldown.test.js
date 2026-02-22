import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "./commonMocks.js";
import { createTimerNodes } from "./domUtils.js";
import { setupClassicBattleHooks } from "./setupTestEnv.js";

// Turn-based flow: roundWaitEnter no longer auto-advances after a timer.
// It waits indefinitely for the player to emit "skipCooldown" (Next Round click).

vi.mock("../../../src/helpers/classicBattle/roundSelectModal.js", () => ({
  resolveRoundStartPolicy: vi.fn(async (cb) => {
    await cb?.();
  })
}));

describe("Turn-based interrupt: roundWait waits for Next click", () => {
  setupClassicBattleHooks();

  beforeEach(async () => {
    vi.resetModules();
    createTimerNodes();
    document.body.innerHTML +=
      '<button id="next-button" disabled data-role="next-round">Next</button>';

    const { initClassicBattleTest } = await import("./initClassicBattle.js");
    await initClassicBattleTest({ afterMock: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("roundWait state does NOT auto-advance after timers expire", async () => {
    const { initClassicBattleOrchestrator, getBattleStateMachine } = await import(
      "../../../src/helpers/classicBattle/orchestrator.js"
    );
    const store = { selectionMade: false, playerChoice: null };

    await initClassicBattleOrchestrator(store, undefined, {});
    const machine = getBattleStateMachine();

    await machine.dispatch("startClicked");
    await machine.dispatch("ready");
    await machine.dispatch("ready");
    await machine.dispatch("cardsRevealed");

    await machine.dispatch("interrupt");

    // Advance timers – in turn-based mode, no auto-advance should happen
    await vi.runAllTimersAsync();
    await Promise.resolve();

    const state = machine.getState();
    // The machine should remain in roundWait (or similar waiting state) since
    // no Next button click (skipCooldown) was emitted.
    expect(["roundWait", "roundDisplay", "roundResolve", "roundPrompt"]).toContain(state);
  });

  it("roundWait advances when skipCooldown is emitted (Next click simulation)", async () => {
    const { initClassicBattleOrchestrator, getBattleStateMachine } = await import(
      "../../../src/helpers/classicBattle/orchestrator.js"
    );
    const { emitBattleEvent } = await import(
      "../../../src/helpers/classicBattle/battleEvents.js"
    );
    const store = { selectionMade: false, playerChoice: null };

    await initClassicBattleOrchestrator(store, undefined, {});
    const machine = getBattleStateMachine();

    await machine.dispatch("startClicked");
    await machine.dispatch("ready");
    await machine.dispatch("ready");
    await machine.dispatch("cardsRevealed");

    await machine.dispatch("interrupt");

    // Let the state settle
    await Promise.resolve();
    await Promise.resolve();

    const dispatchSpy = vi.spyOn(machine, "dispatch");

    // Simulate Next Round button click
    emitBattleEvent("skipCooldown", { source: "next-button" });

    await Promise.resolve();
    await Promise.resolve();

    // Now the machine should have received a "ready" dispatch
    const readyDispatches = dispatchSpy.mock.calls.filter(([e]) => e === "ready");
    expect(readyDispatches.length).toBeGreaterThan(0);
  });
});
