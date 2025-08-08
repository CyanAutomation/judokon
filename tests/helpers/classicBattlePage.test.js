import { describe, it, expect, vi, beforeEach } from "vitest";
import { createBattleHeader } from "../utils/testUtils.js";

beforeEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
  vi.resetModules();
  vi.doMock("../../src/helpers/classicBattle/roundSelectModal.js", () => ({
    initRoundSelectModal: (cb) => cb()
  }));
});

describe("classicBattlePage keyboard navigation", () => {
  it("activates stat buttons with Enter and Space", async () => {
    const startRound = vi.fn();
    const waitForComputerCard = vi.fn();
    const handleStatSelection = vi.fn();
    const store = {};
    const loadSettings = vi.fn().mockResolvedValue({
      featureFlags: { randomStatMode: { enabled: true } }
    });
    const initTooltips = vi.fn().mockResolvedValue();
    const setTestMode = vi.fn();
    const showSnackbar = vi.fn();

    vi.doMock("../../src/helpers/classicBattle.js", () => ({
      createBattleStore: () => store,
      startRound,
      handleStatSelection,
      simulateOpponentStat: vi.fn()
    }));
    vi.doMock("../../src/helpers/battleJudokaPage.js", () => ({ waitForComputerCard }));
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({ loadSettings }));
    vi.doMock("../../src/helpers/tooltip.js", () => ({ initTooltips }));
    vi.doMock("../../src/helpers/testModeUtils.js", () => ({ setTestMode }));
    vi.doMock("../../src/helpers/showSnackbar.js", () => ({ showSnackbar }));
    vi.doMock("../../src/helpers/stats.js", () => ({
      loadStatNames: async () => [{ name: "Power" }, { name: "Speed" }]
    }));

    const container = document.createElement("div");
    container.id = "stat-buttons";
    ["power", "speed"].forEach((stat) => {
      const b = document.createElement("button");
      b.dataset.stat = stat;
      container.appendChild(b);
    });
    document.body.appendChild(container);

    const { setupClassicBattlePage } = await import("../../src/helpers/classicBattlePage.js");
    await setupClassicBattlePage();

    const [first, second] = container.querySelectorAll("button");
    first.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(handleStatSelection).toHaveBeenCalledWith(store, "power");
    expect(showSnackbar).toHaveBeenCalledWith("You Picked: Power");

    // re-enable buttons for second key simulation
    container.querySelectorAll("button").forEach((b) => {
      b.disabled = false;
      b.tabIndex = 0;
    });
    handleStatSelection.mockClear();
    showSnackbar.mockClear();

    second.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    expect(handleStatSelection).toHaveBeenCalledWith(store, "speed");
    expect(showSnackbar).toHaveBeenCalledWith("You Picked: Speed");
  });

  it("navigates to Next Round and Quit buttons", async () => {
    const startRound = vi.fn();
    const waitForComputerCard = vi.fn();
    const handleStatSelection = vi.fn();
    const store = {};
    const loadSettings = vi.fn().mockResolvedValue({
      featureFlags: { randomStatMode: { enabled: true } }
    });
    const initTooltips = vi.fn().mockResolvedValue();
    const setTestMode = vi.fn();

    vi.doMock("../../src/helpers/classicBattle.js", () => ({
      createBattleStore: () => store,
      startRound,
      handleStatSelection,
      simulateOpponentStat: vi.fn()
    }));
    vi.doMock("../../src/helpers/battleJudokaPage.js", () => ({ waitForComputerCard }));
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({ loadSettings }));
    vi.doMock("../../src/helpers/tooltip.js", () => ({ initTooltips }));
    vi.doMock("../../src/helpers/testModeUtils.js", () => ({ setTestMode }));
    vi.doMock("../../src/helpers/stats.js", () => ({
      loadStatNames: async () => [{ name: "Power" }]
    }));

    const stats = document.createElement("div");
    stats.id = "stat-buttons";
    const statBtn = document.createElement("button");
    statBtn.dataset.stat = "power";
    stats.appendChild(statBtn);

    const next = document.createElement("button");
    next.id = "next-round-button";
    const quit = document.createElement("button");
    quit.id = "quit-match-button";
    document.body.append(stats, next, quit);

    const { setupClassicBattlePage } = await import("../../src/helpers/classicBattlePage.js");
    await setupClassicBattlePage();

    const focusOrder = () =>
      Array.from(document.querySelectorAll("button")).filter(
        (el) => !el.disabled && el.tabIndex !== -1
      );

    const tab = () => {
      const order = focusOrder();
      const idx = order.indexOf(document.activeElement);
      const nextEl = order[idx + 1];
      nextEl?.focus();
    };

    statBtn.focus();
    tab();
    expect(document.activeElement).toBe(next);
    tab();
    expect(document.activeElement).toBe(quit);
  });
});

describe("classicBattlePage simulated opponent mode", () => {
  it("auto-selects a stat and disables buttons", async () => {
    const startRound = vi.fn();
    const waitForComputerCard = vi.fn();
    const handleStatSelection = vi.fn().mockResolvedValue();
    const simulateOpponentStat = vi.fn(() => "power");
    const store = {};
    const loadSettings = vi.fn().mockResolvedValue({
      featureFlags: { simulatedOpponentMode: { enabled: true } }
    });
    const initTooltips = vi.fn().mockResolvedValue();
    const setTestMode = vi.fn();

    vi.doMock("../../src/helpers/classicBattle.js", () => ({
      createBattleStore: () => store,
      startRound,
      handleStatSelection,
      simulateOpponentStat
    }));
    vi.doMock("../../src/helpers/battleJudokaPage.js", () => ({ waitForComputerCard }));
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({ loadSettings }));
    vi.doMock("../../src/helpers/tooltip.js", () => ({ initTooltips }));
    vi.doMock("../../src/helpers/testModeUtils.js", () => ({ setTestMode }));
    vi.doMock("../../src/helpers/stats.js", () => ({ loadStatNames: async () => [] }));

    const container = document.createElement("div");
    container.id = "stat-buttons";
    const btn = document.createElement("button");
    btn.dataset.stat = "power";
    container.appendChild(btn);
    const next = document.createElement("button");
    next.id = "next-round-button";
    document.body.append(container, next);

    const { setupClassicBattlePage } = await import("../../src/helpers/classicBattlePage.js");
    await setupClassicBattlePage();

    expect(simulateOpponentStat).toHaveBeenCalledWith("easy");
    expect(handleStatSelection).toHaveBeenCalledWith(store, "power");
    const calls = handleStatSelection.mock.calls.length;
    btn.dispatchEvent(new Event("click", { bubbles: true }));
    next.dispatchEvent(new Event("click", { bubbles: true }));
    expect(handleStatSelection).toHaveBeenCalledTimes(calls);
    expect(btn.disabled).toBe(true);
  });
});

describe("classicBattlePage stat help tooltip", () => {
  it("shows tooltip only once", async () => {
    vi.useFakeTimers();
    const startRound = vi.fn();
    const waitForComputerCard = vi.fn();
    const loadSettings = vi.fn().mockResolvedValue({
      featureFlags: { randomStatMode: { enabled: true } }
    });
    const initTooltips = vi.fn().mockResolvedValue();
    const setTestMode = vi.fn();

    const store = {};
    vi.doMock("../../src/helpers/classicBattle.js", () => ({
      createBattleStore: () => store,
      startRound,
      handleStatSelection: vi.fn(),
      simulateOpponentStat: vi.fn()
    }));
    vi.doMock("../../src/helpers/battleJudokaPage.js", () => ({ waitForComputerCard }));
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({ loadSettings }));
    vi.doMock("../../src/helpers/tooltip.js", () => ({ initTooltips }));
    vi.doMock("../../src/helpers/testModeUtils.js", () => ({ setTestMode }));
    vi.doMock("../../src/helpers/stats.js", () => ({ loadStatNames: async () => [] }));

    const help = document.createElement("button");
    help.id = "stat-help";
    document.body.appendChild(help);
    const spy = vi.spyOn(help, "dispatchEvent");

    const { setupClassicBattlePage } = await import("../../src/helpers/classicBattlePage.js");
    await setupClassicBattlePage();
    await vi.runAllTimersAsync();

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[0][0].type).toBe("mouseenter");
    expect(spy.mock.calls[1][0].type).toBe("mouseleave");
    expect(localStorage.getItem("statHintShown")).toBe("true");

    spy.mockClear();
    await setupClassicBattlePage();
    await vi.runAllTimersAsync();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("classicBattlePage test mode flag", () => {
  it("applies data attribute and banner visibility when enabled", async () => {
    const startRound = vi.fn();
    const waitForComputerCard = vi.fn();
    const loadSettings = vi.fn().mockResolvedValue({
      featureFlags: {
        randomStatMode: { enabled: true },
        enableTestMode: {
          enabled: true,
          label: "Test Mode",
          description: "Deterministic card draws for testing"
        }
      }
    });
    const initTooltips = vi.fn().mockResolvedValue();
    const setTestMode = vi.fn();

    const store = {};
    vi.doMock("../../src/helpers/classicBattle.js", () => ({
      createBattleStore: () => store,
      startRound,
      handleStatSelection: vi.fn(),
      simulateOpponentStat: vi.fn()
    }));
    vi.doMock("../../src/helpers/battleJudokaPage.js", () => ({ waitForComputerCard }));
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({ loadSettings }));
    vi.doMock("../../src/helpers/tooltip.js", () => ({ initTooltips }));
    vi.doMock("../../src/helpers/testModeUtils.js", () => ({ setTestMode }));
    vi.doMock("../../src/helpers/stats.js", () => ({ loadStatNames: async () => [] }));

    const battleArea = document.createElement("div");
    battleArea.id = "battle-area";
    const banner = document.createElement("div");
    banner.id = "test-mode-banner";
    banner.className = "hidden";
    document.body.append(battleArea, banner);

    const { setupClassicBattlePage } = await import("../../src/helpers/classicBattlePage.js");
    await setupClassicBattlePage();

    expect(battleArea.dataset.testMode).toBe("true");
    expect(banner.classList.contains("hidden")).toBe(false);
    expect(setTestMode).toHaveBeenCalledWith(true);
  });

  it("storage event updates banner and data attribute", async () => {
    const startRound = vi.fn();
    const waitForComputerCard = vi.fn();
    const loadSettings = vi.fn().mockResolvedValue({
      featureFlags: {
        randomStatMode: { enabled: true },
        enableTestMode: { enabled: false }
      }
    });
    const initTooltips = vi.fn().mockResolvedValue();
    const setTestMode = vi.fn();

    const store = {};
    vi.doMock("../../src/helpers/classicBattle.js", () => ({
      createBattleStore: () => store,
      startRound,
      handleStatSelection: vi.fn(),
      simulateOpponentStat: vi.fn()
    }));
    vi.doMock("../../src/helpers/battleJudokaPage.js", () => ({ waitForComputerCard }));
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({ loadSettings }));
    vi.doMock("../../src/helpers/tooltip.js", () => ({ initTooltips }));
    vi.doMock("../../src/helpers/testModeUtils.js", () => ({ setTestMode }));
    vi.doMock("../../src/helpers/stats.js", () => ({ loadStatNames: async () => [] }));

    const battleArea = document.createElement("div");
    battleArea.id = "battle-area";
    const banner = document.createElement("div");
    banner.id = "test-mode-banner";
    banner.className = "hidden";
    document.body.append(battleArea, banner);

    const { setupClassicBattlePage } = await import("../../src/helpers/classicBattlePage.js");
    await setupClassicBattlePage();

    expect(battleArea.dataset.testMode).toBe("false");
    expect(banner.classList.contains("hidden")).toBe(true);

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "settings",
        newValue: JSON.stringify({ featureFlags: { enableTestMode: { enabled: true } } })
      })
    );

    expect(battleArea.dataset.testMode).toBe("true");
    expect(banner.classList.contains("hidden")).toBe(false);
  });
});

describe("syncScoreDisplay", () => {
  it("keeps scoreboard and summary in sync", async () => {
    window.matchMedia = () => ({ matches: true, addListener() {}, removeListener() {} });
    const header = createBattleHeader();
    const panel = document.createElement("div");
    panel.id = "summary-panel";
    const msg = document.createElement("p");
    msg.id = "summary-message";
    const score = document.createElement("p");
    score.id = "summary-score";
    panel.append(msg, score);
    document.body.append(header, panel);

    const getScores = vi
      .fn()
      .mockReturnValueOnce({ playerScore: 1, computerScore: 2 })
      .mockReturnValueOnce({ playerScore: 3, computerScore: 4 });
    vi.doMock("../../src/helpers/battleEngine.js", () => ({ getScores }));

    const { syncScoreDisplay, showSummary } = await import(
      "../../src/helpers/classicBattle/uiService.js"
    );

    syncScoreDisplay();
    showSummary({ message: "", playerScore: 1, computerScore: 2 });
    let board = document.getElementById("score-display").textContent;
    let summary = document.getElementById("summary-score").textContent;
    let match = board.match(/You: (\d+)\nOpponent: (\d+)/);
    expect(summary).toBe(`Final Score – You: ${match[1]} Opponent: ${match[2]}`);

    syncScoreDisplay();
    showSummary({ message: "", playerScore: 3, computerScore: 4 });
    board = document.getElementById("score-display").textContent;
    summary = document.getElementById("summary-score").textContent;
    match = board.match(/You: (\d+)\nOpponent: (\d+)/);
    expect(summary).toBe(`Final Score – You: ${match[1]} Opponent: ${match[2]}`);
  });
});
