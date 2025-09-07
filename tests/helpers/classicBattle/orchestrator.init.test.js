import { describe, it, expect, vi, beforeEach } from "vitest";

const testPath = "../../../src/helpers";

describe("classic battle orchestrator init preloads", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("preloads dependencies successfully", async () => {
    const preloadTimerUtils = vi.fn().mockResolvedValue();
    const initScoreboardAdapter = vi.fn();
    vi.doMock(`${testPath}/TimerController.js`, () => ({ preloadTimerUtils }));
    vi.doMock(`${testPath}/classicBattle/uiService.js`, () => ({}));
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
    vi.doMock(`${testPath}/classicBattle/uiService.js`, () => {
      throw new Error("fail");
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
