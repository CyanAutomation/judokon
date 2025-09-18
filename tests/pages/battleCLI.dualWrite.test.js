import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const SCOREBOARD_MODULE_PATH = "../../src/components/Scoreboard.js";
const DOM_MODULE_PATH = "../../src/pages/battleCLI/dom.js";

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function tick() {
  await Promise.resolve();
  await vi.advanceTimersByTimeAsync(0);
}

describe("battleCLI dual-write scoreboard (Phase 2)", () => {
  let mockSharedScoreboard;

  async function importDomWithScoreboard(scoreboardModule) {
    const deferred = createDeferred();
    vi.doMock(SCOREBOARD_MODULE_PATH, () => deferred.promise);
    const modulePromise = import(DOM_MODULE_PATH);
    const exports = scoreboardModule ?? mockSharedScoreboard;
    deferred.resolve({ __esModule: true, ...exports });
    await tick();
    const module = await modulePromise;
    await tick();
    return module;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    // Mock the shared Scoreboard component functions
    mockSharedScoreboard = {
      showMessage: vi.fn(),
      updateScore: vi.fn(),
      updateRoundCounter: vi.fn()
    };

    // Setup DOM structure
    document.body.innerHTML = `
      <header class="cli-header">
        <div class="cli-status">
          <div id="cli-round">Round 0 of 0</div>
          <div id="cli-score" data-score-player="0" data-score-opponent="0">You: 0 Opponent: 0</div>
        </div>
        <div class="standard-scoreboard-nodes" style="display: block;">
          <p id="next-round-timer" aria-live="polite" aria-atomic="true" role="status"></p>
          <p id="round-counter" aria-live="polite" aria-atomic="true">Round 0</p>
          <p id="score-display" aria-live="off" aria-atomic="true">You: 0 Opponent: 0</p>
        </div>
      </header>
      <main>
        <section>
          <div id="round-message" role="status" aria-live="polite" aria-atomic="true"></div>
          <div id="cli-countdown" role="status" aria-live="polite" data-remaining-time="0"></div>
        </section>
      </main>
    `;

  });

  afterEach(async () => {
    document.body.innerHTML = "";
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.doUnmock(SCOREBOARD_MODULE_PATH);
    vi.resetModules();
    const scoreboardModule = await import(SCOREBOARD_MODULE_PATH);
    expect(vi.isMockFunction(scoreboardModule.showMessage)).toBe(false);
    expect(vi.isMockFunction(scoreboardModule.updateScore)).toBe(false);
    expect(vi.isMockFunction(scoreboardModule.updateRoundCounter)).toBe(false);
    vi.resetModules();
  });

  it("should update both CLI and standard elements when setting round message", async () => {
    const { setRoundMessage } = await importDomWithScoreboard();

    const testMessage = "Player wins this round!";
    setRoundMessage(testMessage);

    expect(mockSharedScoreboard.showMessage).toHaveBeenCalledWith(testMessage, { outcome: false });

    // Verify CLI element updated
    const cliMessage = document.getElementById("round-message");
    expect(cliMessage.textContent).toBe(testMessage);
  });

  it("should update both CLI and standard elements when updating score", async () => {
    // Mock the engine facade
    vi.doMock("../../src/helpers/battleEngineFacade.js", () => ({
      getScores: () => ({ playerScore: 2, opponentScore: 1 })
    }));

    const { updateScoreLine } = await importDomWithScoreboard();

    updateScoreLine();

    expect(mockSharedScoreboard.updateScore).toHaveBeenCalledWith(2, 1);

    // Verify CLI element updated
    const cliScore = document.getElementById("cli-score");
    expect(cliScore.textContent).toBe("You: 2 Opponent: 1");
    expect(cliScore.dataset.scorePlayer).toBe("2");
    expect(cliScore.dataset.scoreOpponent).toBe("1");
  });

  it("should update both CLI and standard elements when updating round header", async () => {
    const { updateRoundHeader } = await importDomWithScoreboard();

    updateRoundHeader(3, 5);

    expect(mockSharedScoreboard.updateRoundCounter).toHaveBeenCalledWith(3);

    // Verify CLI element updated
    const cliRound = document.getElementById("cli-round");
    expect(cliRound.textContent).toBe("Round 3 Target: 5");

    // Verify root dataset updated
    const root = document.getElementById("cli-root") || document.body;
    if (root.id === "cli-root") {
      expect(root.dataset.round).toBe("3");
      expect(root.dataset.target).toBe("5");
    }
  });

  it("should have standard scoreboard nodes visible after Phase 2", () => {
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

    // Should not throw error even if shared component methods are missing
    expect(() => setRoundMessage("Test message")).not.toThrow();

    // CLI element should still be updated
    const cliMessage = document.getElementById("round-message");
    expect(cliMessage.textContent).toBe("Test message");
    expect(mockSharedScoreboard.showMessage).not.toHaveBeenCalled();
  });
});
