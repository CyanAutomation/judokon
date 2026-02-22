import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "./commonMocks.js";
import { createTimerNodes } from "./domUtils.js";
import { setupClassicBattleHooks } from "./setupTestEnv.js";

// Turn-based flow: after an interrupt, roundWait is entered and the machine
// waits indefinitely for the player to emit "skipCooldown" (Next Round click).
// There is NO auto-advance after a timer expires.

vi.mock("../../../src/helpers/classicBattle/roundSelectModal.js", () => ({
  resolveRoundStartPolicy: vi.fn(async (cb) => {
    await cb?.();
  })
}));

describe("interrupt → roundWait turn-based flow", () => {
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

  it("does NOT auto-advance from roundWait after timers expire", async () => {
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

    // Exhaust all pending fake timers
    await vi.runAllTimersAsync();
    await Promise.resolve();

    const state = machine.getState();
    // In turn-based mode the machine must remain in a waiting state –
    // it should NOT have advanced to roundPrompt without a skipCooldown event.
    expect(["roundWait", "interruptRound", "roundDisplay", "roundResolve"]).toContain(state);
  });

  it("advances from roundWait when skipCooldown is emitted", async () => {
    const { initClassicBattleOrchestrator, getBattleStateMachine } = await import(
      "../../../src/helpers/classicBattle/orchestrator.js"
    );
    const { emitBattleEvent } = await import("../../../src/helpers/classicBattle/battleEvents.js");
    const store = { selectionMade: false, playerChoice: null };
    await initClassicBattleOrchestrator(store, undefined, {});
    const machine = getBattleStateMachine();

    await machine.dispatch("startClicked");
    await machine.dispatch("ready");
    await machine.dispatch("ready");
    await machine.dispatch("cardsRevealed");
    await machine.dispatch("interrupt");

    await Promise.resolve();
    await Promise.resolve();

    const dispatchSpy = vi.spyOn(machine, "dispatch");

    // Simulate Next Round click
    emitBattleEvent("skipCooldown", { source: "next-button" });

    await Promise.resolve();
    await Promise.resolve();

    const readyDispatches = dispatchSpy.mock.calls.filter(([e]) => e === "ready");
    expect(readyDispatches.length).toBeGreaterThan(0);
  });
});
