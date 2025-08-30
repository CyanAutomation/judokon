import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockScheduler } from "./mockScheduler.js";
let scheduler;

vi.mock("../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: () => {},
  updateSnackbar: () => {}
}));

vi.mock("../../src/helpers/setupScoreboard.js", () => ({
  clearTimer: vi.fn(),
  showMessage: () => {},
  showAutoSelect: () => {},
  showTemporaryMessage: () => () => {},
  updateTimer: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/uiHelpers.js", () => ({
  updateDebugPanel: () => {}
}));

vi.mock("../../src/helpers/testModeUtils.js", () => ({
  seededRandom: () => 0,
  isTestModeEnabled: () => false
}));

vi.mock("../../src/helpers/timerUtils.js", () => ({
  getDefaultTimer: () => Promise.resolve(1)
}));

vi.mock("../../src/helpers/classicBattle/orchestrator.js", () => ({
  dispatchBattleEvent: () => Promise.resolve()
}));

describe("timerService autoSelect flag", () => {
  beforeEach(() => {
    scheduler = createMockScheduler();
    document.body.innerHTML = "";
    vi.clearAllMocks();
    vi.resetModules();
    vi.doMock("../../src/helpers/battleEngineFacade.js", () => {
      const makeTimer = (onTick, onExpired, duration) => {
        onTick(duration);
        for (let i = 1; i <= duration; i++) {
          scheduler.setTimeout(() => {
            const remaining = duration - i;
            onTick(remaining);
            if (remaining <= 0) onExpired();
          }, i * 1000);
        }
      };
      return {
        startRound: makeTimer,
        startCoolDown: makeTimer,
        stopTimer: vi.fn(),
        STATS: ["a", "b"]
      };
    });
  });

  it("auto-select triggers when flag enabled", async () => {
    const mockAuto = vi.fn();
    vi.doMock("../../src/helpers/featureFlags.js", () => ({ isEnabled: () => true }));
    vi.doMock("../../src/helpers/classicBattle/autoSelectStat.js", () => ({
      autoSelectStat: mockAuto
    }));
    const { startTimer } = await import("../../src/helpers/classicBattle/timerService.js");
    await startTimer(async () => {});
    scheduler.tick(1000);
    expect(mockAuto).toHaveBeenCalledTimes(1);
  });

  it("skips auto-select when flag disabled", async () => {
    const mockAuto = vi.fn();
    vi.doMock("../../src/helpers/featureFlags.js", () => ({ isEnabled: () => false }));
    vi.doMock("../../src/helpers/classicBattle/autoSelectStat.js", () => ({
      autoSelectStat: mockAuto
    }));
    const { startTimer } = await import("../../src/helpers/classicBattle/timerService.js");
    await startTimer(async () => {});
    scheduler.tick(1000);
    expect(mockAuto).not.toHaveBeenCalled();
  });
});
