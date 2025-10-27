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
    vi.doMock("../../src/helpers/battleEngineFacade.js", () => ({
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

    // Verify CLI element updated (even if hidden)
    const cliMessage = document.getElementById("round-message");
    expect(cliMessage.textContent).toBe(testMessage);

    // Verify legacy CLI scoreboard elements are hidden after init
    const cliRound = document.getElementById("cli-round");
    expect(window.getComputedStyle(cliRound).display).toBe("none");
    expect(cliRound.style.display).toBe("none");
    expect(cliRound.getAttribute("aria-hidden")).toBe("true");
    expect(cliRound.getAttribute("aria-label")).toBe(
      "Legacy round display (replaced by shared scoreboard)"
    );
    const cliScore = document.getElementById("cli-score");
    expect(cliScore.style.display).toBe("none");
    expect(cliScore.getAttribute("aria-hidden")).toBe("true");
    expect(cliScore.getAttribute("aria-label")).toBe(
      "Legacy score display (replaced by shared scoreboard)"
    );
  });

  it("should update both CLI and standard elements when updating score", async () => {
    // Mock the engine facade
    vi.doMock("../../src/helpers/battleEngineFacade.js", () => ({
      getScores: () => ({ playerScore: 2, opponentScore: 1 }),
      getPointsToWin: () => 5
    }));

    const { updateScoreLine } = await importDomWithScoreboard();
    await ensureCliDom();
    const { init } = await import(INIT_MODULE_PATH);
    await init(() => {}); // Dummy startCallback

    updateScoreLine();

    expect(mockSharedScoreboard.updateScore).toHaveBeenCalledWith(2, 1);

    // Verify CLI element updated (even if hidden)
    const cliScore = document.getElementById("cli-score");
    expect(cliScore.textContent).toBe("You: 2 Opponent: 1");
    expect(cliScore.dataset.scorePlayer).toBe("2");
    expect(cliScore.dataset.scoreOpponent).toBe("1");

    // Verify legacy elements are hidden
    expect(cliScore.style.display).toBe("none");
    expect(cliScore.getAttribute("aria-hidden")).toBe("true");
  });

  it("should update both CLI and standard elements when updating round header", async () => {
    const { updateRoundHeader } = await importDomWithScoreboard();
    await ensureCliDom();
    const { init } = await import(INIT_MODULE_PATH);
    await init(() => {}); // Dummy startCallback

    updateRoundHeader(3, 5);

    expect(mockSharedScoreboard.updateRoundCounter).toHaveBeenCalledWith(3);

    // Verify CLI element updated (even if hidden)
    const cliRound = document.getElementById("cli-round");
    expect(cliRound.textContent).toBe("Round 3 Target: 5");

    // Verify root dataset updated
    const root = document.getElementById("cli-root") || document.body;
    if (root.id === "cli-root") {
      expect(root.dataset.round).toBe("3");
      expect(root.dataset.target).toBe("5");
    }

    // Verify legacy elements are hidden
    expect(cliRound.style.display).toBe("none");
    expect(cliRound.getAttribute("aria-hidden")).toBe("true");
  });

  it("falls back to engine target when updateRoundHeader receives undefined", async () => {
    vi.doMock("../../src/helpers/battleEngineFacade.js", () => ({
      getPointsToWin: () => 9
    }));

    const { updateRoundHeader } = await importDomWithScoreboard();
    await ensureCliDom();
    const { init } = await import(INIT_MODULE_PATH);
    await init(() => {}); // Dummy startCallback

    updateRoundHeader(4);

    expect(mockSharedScoreboard.updateRoundCounter).toHaveBeenCalledWith(4);
    const cliRound = document.getElementById("cli-round");
    expect(cliRound.textContent).toBe("Round 4 Target: 9");
    const root = document.getElementById("cli-root");
    expect(root.dataset.round).toBe("4");
    expect(root.dataset.target).toBe("9");
  });

  it("should have standard scoreboard nodes visible after Phase 2", async () => {
    await ensureCliDom();
    const standardNodes = document.querySelector(".standard-scoreboard-nodes");
    expect(standardNodes).toBeTruthy();
    expect(standardNodes.style.display).toBe("block");
    expect(standardNodes.hasAttribute("aria-hidden")).toBe(false);

    // Verify all standard elements exist and are accessible
    expect(document.getElementById("next-round-timer")).toBeTruthy();
    expect(document.getElementById("round-counter")).toBeTruthy();
    expect(document.getElementById("score-display")).toBeTruthy();
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

    // Verify legacy elements are hidden
    const cliRound = document.getElementById("cli-round");
    expect(cliRound.style.display).toBe("none");
    expect(cliRound.getAttribute("aria-hidden")).toBe("true");
    const cliScore = document.getElementById("cli-score");
    expect(cliScore.style.display).toBe("none");
    expect(cliScore.getAttribute("aria-hidden")).toBe("true");
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

    const cliRound = document.getElementById("cli-round");
    expect(cliRound.style.display).not.toBe("none");
    expect(cliRound.getAttribute("aria-hidden")).not.toBe("true");

    const cliScore = document.getElementById("cli-score");
    expect(cliScore.style.display).not.toBe("none");
    expect(cliScore.getAttribute("aria-hidden")).not.toBe("true");
  });
});
