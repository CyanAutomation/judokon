import { describe, it, expect, vi, beforeEach } from "vitest";
import { createBattleHeader } from "../utils/testUtils.js";

beforeEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
  vi.resetModules();
  vi.doUnmock("../../src/helpers/settingsStorage.js");
  vi.doMock("../../src/helpers/classicBattle/orchestrator.js", () => ({
    initClassicBattleOrchestrator: vi.fn()
  }));
  vi.doMock("../../src/helpers/classicBattle/eventDispatcher.js", () => ({
    dispatchBattleEvent: vi.fn().mockResolvedValue()
  }));
});

describe("syncScoreDisplay", () => {
  it("keeps scoreboard and summary in sync", async () => {
    window.matchMedia = () => ({ matches: true, addListener() {}, removeListener() {} });
    const header = createBattleHeader();
    document.body.append(header);

    const getScores = vi
      .fn()
      .mockReturnValueOnce({ playerScore: 1, opponentScore: 2 })
      .mockReturnValueOnce({ playerScore: 3, opponentScore: 4 });
    vi.doMock("../../src/helpers/battleEngineFacade.js", () => ({
      getScores,
      startCoolDown: vi.fn(),
      pauseTimer: vi.fn(),
      resumeTimer: vi.fn()
    }));
    vi.doMock("../../src/components/Button.js", () => ({
      createButton: (label, { id } = {}) => {
        const btn = document.createElement("button");
        if (id) btn.id = id;
        btn.textContent = label;
        return btn;
      }
    }));
    vi.doMock("../../src/components/Modal.js", () => ({
      createModal: (content) => {
        const element = document.createElement("div");
        element.className = "modal-backdrop";
        element.appendChild(content);
        return { element, open: vi.fn(), close: vi.fn(), destroy: vi.fn() };
      }
    }));
    vi.doMock("../../src/helpers/setupScoreboard.js", () => ({
      updateScore: (p, o) => {
        let el = document.getElementById("score-display");
        if (!el) {
          el = document.createElement("p");
          el.id = "score-display";
          document.body.appendChild(el);
        }
        el.textContent = `You: ${p}\nOpponent: ${o}`;
      },
      clearTimer: vi.fn(),
      updateTimer: vi.fn()
    }));

    vi.doMock("../../src/config/loadSettings.js", () => ({
      loadSettings: vi.fn()
    }));
    vi.doMock("../../src/helpers/settingsStorage.js", () => ({
      getSetting: () => true
    }));
    const { syncScoreDisplay, showMatchSummaryModal } = await import(
      "../../src/helpers/classicBattle/uiService.js"
    );

    syncScoreDisplay();
    const handleReplay = vi.fn();
    showMatchSummaryModal({ message: "", playerScore: 1, opponentScore: 2 }, handleReplay);
    let board = document.getElementById("score-display").textContent;
    let summary = document.querySelector(".modal-backdrop #match-summary-score").textContent;
    let match = board.match(/You: (\d+)\nOpponent: (\d+)/);
    expect(summary).toBe(`Final Score – You: ${match[1]} Opponent: ${match[2]}`);
    document.getElementById("match-summary-next").click();
    expect(handleReplay).toHaveBeenCalled();

    document.querySelectorAll(".modal-backdrop").forEach((el) => el.remove());

    syncScoreDisplay();
    showMatchSummaryModal({ message: "", playerScore: 3, opponentScore: 4 }, vi.fn());
    board = document.getElementById("score-display").textContent;
    summary = document.querySelector(".modal-backdrop #match-summary-score").textContent;
    match = board.match(/You: (\d+)\nOpponent: (\d+)/);
    expect(summary).toBe(`Final Score – You: ${match[1]} Opponent: ${match[2]}`);
  });
});
