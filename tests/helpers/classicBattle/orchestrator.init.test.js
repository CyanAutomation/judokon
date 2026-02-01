import { describe, it, expect, vi, beforeEach } from "vitest";

// ===== Top-level vi.hoisted() for shared mock state =====
const {
  preloadTimerUtils1,
  bindScoreboardEventHandlersOnce1,
  preloadTimerUtils2,
  bindScoreboardEventHandlersOnce2
} = vi.hoisted(() => ({
  preloadTimerUtils1: vi.fn().mockResolvedValue(),
  bindScoreboardEventHandlersOnce1: vi.fn(),
  preloadTimerUtils2: vi.fn().mockRejectedValue(new Error("fail")),
  bindScoreboardEventHandlersOnce2: vi.fn().mockImplementation(() => {
    throw new Error("fail");
  })
}));

// ===== Top-level vi.mock() calls (static paths) =====
vi.mock("../../../src/helpers/TimerController.js", () => ({
  preloadTimerUtils: preloadTimerUtils1
}));

vi.mock("../../../src/helpers/classicBattle/uiService.js", () => ({
  bindScoreboardEventHandlersOnce: bindScoreboardEventHandlersOnce1,
  bindCountdownEventHandlersOnce: vi.fn(),
  bindUIServiceEventHandlersOnce: vi.fn()
}));

describe("classic battle orchestrator init preloads", () => {
  beforeEach(() => {
    preloadTimerUtils1.mockClear();
    bindScoreboardEventHandlersOnce1.mockClear();
    preloadTimerUtils2.mockClear();
    bindScoreboardEventHandlersOnce2.mockClear();
    vi.resetModules();
  });

  it("preloads dependencies successfully", async () => {
    const preloadTimerUtils = vi.fn().mockResolvedValue();
    const bindScoreboardEventHandlersOnce = vi.fn();
    vi.doMock("../../../src/helpers/TimerController.js", () => ({ preloadTimerUtils }));
    vi.doMock("../../../src/helpers/classicBattle/uiService.js", () => ({
      bindScoreboardEventHandlersOnce,
      bindCountdownEventHandlersOnce: vi.fn(),
      bindUIServiceEventHandlersOnce: vi.fn()
    }));
    const { initClassicBattleTest } = await import("./initClassicBattle.js");
    await initClassicBattleTest({ afterMock: true });
    const orchestrator = await import("../../../src/helpers/classicBattle/orchestrator.js");
    await orchestrator.initClassicBattleOrchestrator({});
    expect(preloadTimerUtils).toHaveBeenCalled();
    expect(bindScoreboardEventHandlersOnce).toHaveBeenCalled();
  });

  it("swallows preload errors", async () => {
    const preloadTimerUtils = vi.fn().mockRejectedValue(new Error("fail"));
    const bindScoreboardEventHandlersOnce = vi.fn().mockImplementation(() => {
      throw new Error("fail");
    });
    vi.doMock("../../../src/helpers/TimerController.js", () => ({ preloadTimerUtils }));
    vi.doMock("../../../src/helpers/classicBattle/uiService.js", () => ({
      bindScoreboardEventHandlersOnce,
      bindCountdownEventHandlersOnce: vi.fn(),
      bindUIServiceEventHandlersOnce: vi.fn()
    }));
    const { initClassicBattleTest } = await import("./initClassicBattle.js");
    await initClassicBattleTest({ afterMock: true });
    const orchestrator = await import("../../../src/helpers/classicBattle/orchestrator.js");
    await expect(orchestrator.initClassicBattleOrchestrator({})).resolves.toBeDefined();
    expect(preloadTimerUtils).toHaveBeenCalled();
    expect(bindScoreboardEventHandlersOnce).toHaveBeenCalled();
  });
});
