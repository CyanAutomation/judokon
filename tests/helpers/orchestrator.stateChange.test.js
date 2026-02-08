import { describe, it, expect, beforeEach, vi } from "vitest";

// ===== Top-level vi.hoisted() for shared mock state =====
const { createStateManager, handlers, resetGame } = vi.hoisted(() => {
  const createStateManagerMock = vi.fn(async (_onEnter, _context, onTransition) => {
    await onTransition({ from: "a", to: "b", event: "go" });
    return { context: {}, getState: () => "b", dispatch: vi.fn() };
  });
  return {
    createStateManager: createStateManagerMock,
    handlers: {
      waitingForMatchStartEnter: vi.fn(),
      matchStartEnter: vi.fn(),
      roundWaitEnter: vi.fn(),
      roundPromptEnter: vi.fn(),
      roundSelectEnter: vi.fn(),
      roundResolveEnter: vi.fn(),
      roundDisplayEnter: vi.fn(),
      matchEvaluateEnter: vi.fn(),
      matchDecisionEnter: vi.fn(),
      matchOverEnter: vi.fn(),
      interruptRoundEnter: vi.fn(),
      interruptMatchEnter: vi.fn(),
      roundModificationEnter: vi.fn()
    },
    resetGame: vi.fn()
  };
});

// ===== Top-level vi.mock() calls =====
vi.mock("../../src/helpers/classicBattle/stateManager.js", () => ({
  createStateManager
}));

vi.mock("../../src/helpers/classicBattle/orchestratorHandlers.js", () => handlers);

vi.mock("../../src/helpers/classicBattle/roundManager.js", () => ({
  resetGame,
  startRound: vi.fn()
}));

// Replaced test verifying battleStateChange event and optional callback

describe("initClassicBattleOrchestrator state change hooks", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("emits battleStateChange and invokes onStateChange", async () => {
    // Mocks already configured at module-level

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
