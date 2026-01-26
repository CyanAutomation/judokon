import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";

const SCOREBOARD_MODULE_PATH = "../../src/components/Scoreboard.js";
const DOM_MODULE_PATH = "../../src/pages/battleCLI/dom.js";
const INIT_MODULE_PATH = "../../src/pages/battleCLI/init.js";

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("battleCLI dual-write scoreboard (Phase 2)", () => {
  let mockSharedScoreboard;
  let timers;

  async function importDomWithScoreboard(scoreboardModule) {
    const deferred = createDeferred();
    vi.doMock(SCOREBOARD_MODULE_PATH, () => deferred.promise);
    const modulePromise = import(DOM_MODULE_PATH);
    const exports = scoreboardModule ?? mockSharedScoreboard;
    deferred.resolve({ __esModule: true, ...exports });
    const module = await modulePromise;
    await module.waitForSharedScoreboard();
    return module;
  }

  async function ensureCliDom() {
    const { battleCLI } = await import("../../src/pages/index.js");
    battleCLI.ensureCliDomForTest({ reset: true });
  }

  // Tests call `ensureCliDom()` after their Scoreboard mocks are registered. Importing the
  // CLI DOM earlier (e.g., within `beforeEach`) would eagerly load the real Scoreboard module
  // before `vi.doMock` can intercept it, breaking the dual-write assertions.

  beforeEach(async () => {
    window.__TEST__ = true;
    timers = useCanonicalTimers();
    // Mock the shared Scoreboard component functions
    mockSharedScoreboard = {
      showMessage: vi.fn(),
      updateScore: vi.fn(),
      updateRoundCounter: vi.fn()
    };
    // Mock battleEngineFacade for init
    vi.doMock("../../src/helpers/BattleEngine.js", () => ({
      getPointsToWin: () => 5
    }));
    vi.doMock("../../src/helpers/setupScoreboard.js", () => ({
      setupScoreboard: vi.fn()
    }));
    vi.doMock("../../src/helpers/battleScoreboard.js", () => ({
      initBattleScoreboardAdapter: vi.fn()
    }));
  });

  afterEach(async () => {
    document.body.innerHTML = "";
    timers.cleanup();
    vi.clearAllMocks();
    vi.doUnmock(SCOREBOARD_MODULE_PATH);
    vi.doUnmock("../../src/helpers/setupScoreboard.js");
    vi.doUnmock("../../src/helpers/battleScoreboard.js");
    vi.resetModules();
    delete window.__TEST__;
    const scoreboardModule = await import(SCOREBOARD_MODULE_PATH);
    expect(vi.isMockFunction(scoreboardModule.showMessage)).toBe(false);
    expect(vi.isMockFunction(scoreboardModule.updateScore)).toBe(false);
    expect(vi.isMockFunction(scoreboardModule.updateRoundCounter)).toBe(false);
    vi.resetModules();
  });

  it("should update both CLI and standard elements when setting round message", async () => {
    const { setRoundMessage } = await importDomWithScoreboard();
    await ensureCliDom();
    const { init } = await import(INIT_MODULE_PATH);
    await init(() => {}); // Dummy startCallback

    const testMessage = "Player wins this round!";
    setRoundMessage(testMessage);

    expect(mockSharedScoreboard.showMessage).toHaveBeenCalledWith(testMessage, { outcome: false });

    // Verify CLI element updated (shared element with scoreboard)
    const cliMessage = document.getElementById("round-message");
    expect(cliMessage.textContent).toBe(testMessage);
  });

  it("should update both CLI and standard elements when updating score", async () => {
    // Mock the engine facade
    vi.doMock("../../src/helpers/BattleEngine.js", () => ({
      getScores: () => ({ playerScore: 2, opponentScore: 1 }),
      getPointsToWin: () => 5
    }));

    const { updateScoreLine } = await importDomWithScoreboard();
    await ensureCliDom();
    const { init } = await import(INIT_MODULE_PATH);
    await init(() => {}); // Dummy startCallback

    updateScoreLine();

    expect(mockSharedScoreboard.updateScore).toHaveBeenCalledWith(2, 1);

    // Verify shared scoreboard element updated in DOM
    const scoreDisplay = document.getElementById("score-display");
    expect(scoreDisplay.textContent.replace(/\s+/g, " ").trim()).toBe("You: 2 Opponent: 1");
    expect(scoreDisplay.dataset.scorePlayer).toBe("2");
    expect(scoreDisplay.dataset.scoreOpponent).toBe("1");
  });

  it("should update both CLI and standard elements when updating round header", async () => {
    const { updateRoundHeader } = await importDomWithScoreboard();
    await ensureCliDom();
    const { init } = await import(INIT_MODULE_PATH);
    await init(() => {}); // Dummy startCallback

    updateRoundHeader(3, 5);

    expect(mockSharedScoreboard.updateRoundCounter).toHaveBeenCalledWith(3);

    // Verify scoreboard element updated
    const roundCounter = document.getElementById("round-counter");
    expect(roundCounter.textContent).toBe("Round 3 Target: 5");
    expect(roundCounter.dataset.target).toBe("5");

    // Verify root dataset updated
    const root = document.getElementById("cli-root") || document.body;
    if (root.id === "cli-root") {
      expect(root.dataset.round).toBe("3");
      expect(root.dataset.target).toBe("5");
    }
  });

  it("falls back to engine target when updateRoundHeader receives undefined", async () => {
    vi.doMock("../../src/helpers/BattleEngine.js", () => ({
      getPointsToWin: () => 9
    }));

    const { updateRoundHeader } = await importDomWithScoreboard();
    await ensureCliDom();
    const { init } = await import(INIT_MODULE_PATH);
    await init(() => {}); // Dummy startCallback

    updateRoundHeader(4);

    expect(mockSharedScoreboard.updateRoundCounter).toHaveBeenCalledWith(4);
    const roundCounter = document.getElementById("round-counter");
    expect(roundCounter.textContent).toBe("Round 4 Target: 9");
    expect(roundCounter.dataset.target).toBe("9");
    const root = document.getElementById("cli-root");
    expect(root.dataset.round).toBe("4");
    expect(root.dataset.target).toBe("9");
  });

  it("should render the shared scoreboard nodes inside the CLI header", async () => {
    await ensureCliDom();
    const statusRegion = document.querySelector(".cli-status");
    expect(statusRegion).toBeTruthy();

    const timer = document.getElementById("next-round-timer");
    const roundCounter = document.getElementById("round-counter");
    const scoreDisplay = document.getElementById("score-display");

    expect(timer).toBeTruthy();
    expect(roundCounter).toBeTruthy();
    expect(scoreDisplay).toBeTruthy();

    expect(statusRegion.contains(timer)).toBe(true);
    expect(statusRegion.contains(roundCounter)).toBe(true);
    expect(statusRegion.contains(scoreDisplay)).toBe(true);
  });

  it("should gracefully handle missing shared scoreboard helpers", async () => {
    const { setRoundMessage } = await importDomWithScoreboard({});
    await ensureCliDom();
    const { init } = await import(INIT_MODULE_PATH);
    await init(() => {}); // Dummy startCallback

    // Should not throw error even if shared component methods are missing
    expect(() => setRoundMessage("Test message")).not.toThrow();

    // CLI element should still be updated
    const cliMessage = document.getElementById("round-message");
    expect(cliMessage.textContent).toBe("Test message");
    expect(mockSharedScoreboard.showMessage).not.toHaveBeenCalled();

    const roundCounter = document.getElementById("round-counter");
    const scoreDisplay = document.getElementById("score-display");
    expect(roundCounter).toBeTruthy();
    expect(scoreDisplay).toBeTruthy();
    expect(window.getComputedStyle(roundCounter).display).not.toBe("none");
    expect(window.getComputedStyle(scoreDisplay).display).not.toBe("none");
  });

  it("should retain legacy scoreboard elements when shared init throws", async () => {
    vi.doMock("../../src/helpers/setupScoreboard.js", () => ({
      setupScoreboard: vi.fn(() => {
        throw new Error("boom");
      })
    }));
    vi.doMock("../../src/helpers/battleScoreboard.js", () => ({
      initBattleScoreboardAdapter: vi.fn(() => {
        throw new Error("boom");
      })
    }));

    const { setRoundMessage } = await importDomWithScoreboard();
    await ensureCliDom();
    const { init } = await import(INIT_MODULE_PATH);
    await init(() => {}); // Dummy startCallback

    expect(() => setRoundMessage("fallback message")).not.toThrow();

    const roundCounter = document.getElementById("round-counter");
    const scoreDisplay = document.getElementById("score-display");
    expect(roundCounter).toBeTruthy();
    expect(scoreDisplay).toBeTruthy();
    expect(window.getComputedStyle(roundCounter).display).not.toBe("none");
    expect(window.getComputedStyle(scoreDisplay).display).not.toBe("none");
  });
});
