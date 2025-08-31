import { describe, it, expect, beforeEach, vi } from "vitest";

// Replaced test verifying battleStateChange event and optional callback

describe("initClassicBattleOrchestrator state change hooks", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("emits battleStateChange and invokes onStateChange", async () => {
    vi.doMock("../../src/helpers/classicBattle/stateMachine.js", () => ({
      BattleStateMachine: {
        create: vi.fn(async (_onEnter, _context, onTransition) => {
          await onTransition({ from: "a", to: "b", event: "go" });
          return { context: {}, getState: () => "b" };
        })
      }
    }));
    vi.doMock("../../src/helpers/classicBattle/orchestratorHandlers.js", () => ({
      waitingForMatchStartEnter: vi.fn(),
      matchStartEnter: vi.fn(),
      cooldownEnter: vi.fn(),
      roundStartEnter: vi.fn(),
      waitingForPlayerActionEnter: vi.fn(),
      roundDecisionEnter: vi.fn(),
      roundOverEnter: vi.fn(),
      matchDecisionEnter: vi.fn(),
      matchOverEnter: vi.fn(),
      interruptRoundEnter: vi.fn(),
      interruptMatchEnter: vi.fn(),
      roundModificationEnter: vi.fn()
    }));
    vi.doMock("../../src/helpers/classicBattle/roundManager.js", () => ({
      resetGame: vi.fn(),
      startRound: vi.fn()
    }));

    const { onBattleEvent, __resetBattleEventTarget } = await import(
      "../../src/helpers/classicBattle/battleEvents.js"
    );
    __resetBattleEventTarget();
    const eventSpy = vi.fn();
    const eventPromise = new Promise((resolve) => {
      onBattleEvent("battleStateChange", (e) => {
        eventSpy(e.detail);
        resolve();
      });
    });

    const orchestrator = await import("../../src/helpers/classicBattle/orchestrator.js");
    const cb = vi.fn();
    await orchestrator.initClassicBattleOrchestrator({}, undefined, { onStateChange: cb });

    await eventPromise;
    expect(eventSpy).toHaveBeenCalledWith({ from: "a", to: "b", event: "go" });
    expect(cb).toHaveBeenCalledWith({ from: "a", to: "b", event: "go" });
  });
});
