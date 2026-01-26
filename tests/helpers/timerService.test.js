import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockScheduler } from "./mockScheduler.js";
import { mount, clearBody } from "./domUtils.js";
let scheduler;

// ===== Top-level vi.hoisted() for shared mock state =====
const mockAutoSelectStat = vi.fn((onSelect) => {
  const btn = document.querySelector('#stat-buttons button[data-stat="a"]');
  if (btn) btn.classList.add("selected");
  onSelect("a", { delayOpponentMessage: true });
  return Promise.resolve();
});

// ===== Top-level vi.mock() calls (Vitest static analysis phase) =====
vi.mock("../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: () => {},
  updateSnackbar: () => {}
}));

vi.mock("../../src/helpers/setupScoreboard.js", () => ({
  clearTimer: vi.fn(),
  showMessage: () => {},
  showAutoSelect: () => {},
  showTemporaryMessage: () => () => {},
  updateTimer: vi.fn(),
  updateRoundCounter: vi.fn(),
  clearRoundCounter: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/uiHelpers.js", () => ({
  updateDebugPanel: () => {},
  setNextButtonFinalizedState: vi.fn()
}));

vi.mock("../../src/helpers/testModeUtils.js", () => ({
  seededRandom: () => 0,
  isTestModeEnabled: () => false
}));

vi.mock("../../src/helpers/timerUtils.js", () => ({
  getDefaultTimer: () => 2
}));

vi.mock("../../src/helpers/classicBattle/eventDispatcher.js", () => ({
  dispatchBattleEvent: () => Promise.resolve(),
  resetDispatchHistory: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/autoSelectStat.js", () => ({
  autoSelectStat: mockAutoSelectStat
}));

vi.mock("../../src/helpers/BattleEngine.js", () => {
  // Create makeTimer factory function with reference to scheduler
  const makeTimer = (onTick, onExpired, duration) => {
    onTick(duration);
    if (duration <= 0) {
      onExpired();
      return;
    }
    for (let i = 1; i <= duration; i++) {
      scheduler.setTimeout(() => {
        const remaining = duration - i;
        onTick(remaining);
        if (remaining <= 0) onExpired();
      }, i * 1000);
    }
  };
  const mockEngine = {
    startRound: makeTimer,
    startCoolDown: makeTimer,
    stopTimer: vi.fn(),
    STATS: ["a", "b"]
  };
  return {
    requireEngine: () => mockEngine,
    startRound: makeTimer,
    startCoolDown: makeTimer,
    stopTimer: vi.fn(),
    STATS: ["a", "b"]
  };
});

describe("timerService", () => {
  beforeEach(() => {
    scheduler = createMockScheduler();
    mount();
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    clearBody();
  });

  it("invokes skip handler registered after a pending skip", async () => {
    const mod = await import("../../src/helpers/classicBattle/skipHandler.js");
    const handler = vi.fn();
    mod.skipCurrentPhase();
    mod.setSkipHandler(handler);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("updates scoreboard timer and clears on expiration", async () => {
    const scoreboard = await import("../../src/helpers/setupScoreboard.js");
    const { startTimer } = await import("../../src/helpers/classicBattle/timerService.js");
    await startTimer(async () => {}, { selectionMade: false });

    expect(scoreboard.updateTimer).toHaveBeenCalledWith(2);
    scheduler.tick(1000);
    expect(scoreboard.updateTimer).toHaveBeenCalledWith(1);
    scheduler.tick(1000);
    expect(scoreboard.updateTimer).toHaveBeenCalledWith(0);
    expect(scoreboard.clearTimer).toHaveBeenCalledTimes(1);
  });

  it("handles missing document reference gracefully without throwing", async () => {
    const originalDocument = global.document;

    try {
      // Remove the document reference to simulate non-browser environments.
      delete global.document;

      const { startTimer } = await import("../../src/helpers/classicBattle/timerService.js");

      const timer = await startTimer(async () => {}, { selectionMade: false });

      expect(timer).toBeDefined();
      await timer?.stop?.();
    } finally {
      if (originalDocument !== undefined) {
        global.document = originalDocument;
      } else {
        delete global.document;
      }
    }
  });

  it("enables next round when skipped before cooldown starts", async () => {
    const btn = document.createElement("button");
    btn.id = "next-button";
    btn.setAttribute("data-role", "next-round");
    btn.classList.add("disabled");
    document.body.appendChild(btn);
    const timerEl = document.createElement("div");
    timerEl.id = "next-round-timer";
    document.body.appendChild(timerEl);

    const skip = await import("../../src/helpers/classicBattle/skipHandler.js");
    skip.skipCurrentPhase();

    const { startCooldown } = await import("../../src/helpers/classicBattle/roundManager.js");
    const controls = startCooldown({}, scheduler);
    scheduler.tick(0);
    await controls.ready;

    expect(btn.dataset.nextReady).toBe("true");
    expect(btn.disabled).toBe(false);
  });
});
