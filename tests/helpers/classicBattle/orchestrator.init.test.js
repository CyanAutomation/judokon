import { describe, it, expect, vi, beforeEach } from "vitest";

const testPath = "../../../src/helpers";

// ===== Top-level vi.hoisted() for shared mock state =====
const { preloadTimerUtils1, initScoreboardAdapter1, preloadTimerUtils2, initScoreboardAdapter2 } =
  vi.hoisted(() => ({
    preloadTimerUtils1: vi.fn().mockResolvedValue(),
    initScoreboardAdapter1: vi.fn(),
    preloadTimerUtils2: vi.fn().mockRejectedValue(new Error("fail")),
    initScoreboardAdapter2: vi.fn().mockImplementation(() => {
      throw new Error("fail");
    })
  }));

// ===== Top-level vi.mock() calls (static paths with dynamic path variable) =====
vi.mock(`${testPath}/TimerController.js`, () => ({
  preloadTimerUtils: preloadTimerUtils1
}));

vi.mock(`${testPath}/classicBattle/uiService.js`, async () => {
  const actual = await vi.importActual(`${testPath}/classicBattle/uiService.js`);
  return {
    ...actual
  };
});

vi.mock(`${testPath}/classicBattle/scoreboardAdapter.js`, () => ({
  initScoreboardAdapter: initScoreboardAdapter1
}));

describe("classic battle orchestrator init preloads", () => {
  beforeEach(() => {
    preloadTimerUtils1.mockClear();
    initScoreboardAdapter1.mockClear();
    preloadTimerUtils2.mockClear();
    initScoreboardAdapter2.mockClear();
    vi.resetModules();
  });

  it("preloads dependencies successfully", async () => {
    const preloadTimerUtils = vi.fn().mockResolvedValue();
    const initScoreboardAdapter = vi.fn();
    vi.doMock(`${testPath}/TimerController.js`, () => ({ preloadTimerUtils }));
    vi.doMock(`${testPath}/classicBattle/uiService.js`, async () => {
      const actual = await vi.importActual(`${testPath}/classicBattle/uiService.js`);
      return {
        ...actual
      };
    });
    vi.doMock(`${testPath}/classicBattle/scoreboardAdapter.js`, () => ({
      initScoreboardAdapter
    }));
    const { initClassicBattleTest } = await import("./initClassicBattle.js");
    await initClassicBattleTest({ afterMock: true });
    const orchestrator = await import(`${testPath}/classicBattle/orchestrator.js`);
    await orchestrator.initClassicBattleOrchestrator({});
    expect(preloadTimerUtils).toHaveBeenCalled();
    expect(initScoreboardAdapter).toHaveBeenCalled();
  });

  it("swallows preload errors", async () => {
    const preloadTimerUtils = vi.fn().mockRejectedValue(new Error("fail"));
    const initScoreboardAdapter = vi.fn().mockImplementation(() => {
      throw new Error("fail");
    });
    vi.doMock(`${testPath}/TimerController.js`, () => ({ preloadTimerUtils }));
    vi.doMock(`${testPath}/classicBattle/uiService.js`, async () => {
      const actual = await vi.importActual(`${testPath}/classicBattle/uiService.js`);
      return {
        ...actual
      };
    });
    vi.doMock(`${testPath}/classicBattle/scoreboardAdapter.js`, () => ({
      initScoreboardAdapter
    }));
    const { initClassicBattleTest } = await import("./initClassicBattle.js");
    await initClassicBattleTest({ afterMock: true });
    const orchestrator = await import(`${testPath}/classicBattle/orchestrator.js`);
    await expect(orchestrator.initClassicBattleOrchestrator({})).resolves.toBeDefined();
    expect(preloadTimerUtils).toHaveBeenCalled();
    expect(initScoreboardAdapter).toHaveBeenCalled();
  });
});
