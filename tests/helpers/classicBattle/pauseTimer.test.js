import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";
import "./commonMocks.js";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";
import { createRoundMessage } from "./domUtils.js";
import { applyMockSetup } from "./mockSetup.js";

// ===== Top-level vi.hoisted() for shared mock state =====
const {
  mockShowMessage,
  mockShowTemporaryMessage,
  mockClearTimer,
  mockUpdateTimer,
  mockClearMessage,
  mockUpdateScore,
  mockShowAutoSelect,
  mockUpdateRoundCounter,
  mockClearRoundCounter
} = vi.hoisted(() => ({
  mockShowMessage: vi.fn(),
  mockShowTemporaryMessage: () => () => {},
  mockClearTimer: vi.fn(),
  mockUpdateTimer: vi.fn(),
  mockClearMessage: vi.fn(),
  mockUpdateScore: vi.fn(),
  mockShowAutoSelect: vi.fn(),
  mockUpdateRoundCounter: vi.fn(),
  mockClearRoundCounter: vi.fn()
}));

// ===== Top-level vi.mock() calls (Vitest static analysis phase) =====
vi.mock("../../../src/helpers/setupScoreboard.js", () => ({
  showMessage: mockShowMessage,
  showTemporaryMessage: mockShowTemporaryMessage,
  clearTimer: mockClearTimer,
  updateTimer: mockUpdateTimer,
  clearMessage: mockClearMessage,
  updateScore: mockUpdateScore,
  showAutoSelect: mockShowAutoSelect,
  updateRoundCounter: mockUpdateRoundCounter,
  clearRoundCounter: mockClearRoundCounter
}));

let fetchJsonMock;
let generateRandomCardMock;
let getRandomJudokaMock;
let renderMock;

describe("classicBattle timer pause", () => {
  let timers;
  let battleMod;
  let store;
  let logSpy;

  beforeEach(async () => {
    vi.resetModules();
    document.body.innerHTML = "";
    const { playerCard, opponentCard } = createBattleCardContainers();
    const header = createBattleHeader();
    const roundResult = createRoundMessage("round-result");
    const statButtons = document.createElement("div");
    statButtons.id = "stat-buttons";
    statButtons.dataset.tooltipId = "ui.selectStat";
    statButtons.innerHTML = '<button data-stat="power"></button>';
    document.body.append(playerCard, opponentCard, header, roundResult, statButtons);

    timers = useCanonicalTimers();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    fetchJsonMock = vi.fn(async (url) => {
      if (String(url).includes("gameTimers.js")) {
        return [{ id: 1, value: 1, default: true, category: "roundTimer" }];
      }
      return [];
    });

    generateRandomCardMock = vi.fn(async (_d, _g, container, _pm, cb) => {
      container.innerHTML = `<ul><li class=\"stat\"><strong>Power</strong> <span>5</span></li></ul>`;
      if (cb) cb({ id: 1 });
    });
    getRandomJudokaMock = vi.fn(() => ({ id: 2 }));
    renderMock = vi.fn(async () => {
      const el = document.createElement("div");
      el.innerHTML = `<ul><li class=\"stat\"><strong>Power</strong> <span>3</span></li></ul>`;
      return el;
    });
    applyMockSetup({
      fetchJsonMock,
      generateRandomCardMock,
      getRandomJudokaMock,
      renderMock
    });

    mockShowMessage.mockReset();
    mockClearTimer.mockReset();
    mockUpdateTimer.mockReset();
    mockClearMessage.mockReset();
    mockUpdateScore.mockReset();
    mockShowAutoSelect.mockReset();
    mockUpdateRoundCounter.mockReset();
    mockClearRoundCounter.mockReset();

    battleMod = await import("../../../src/helpers/classicBattle.js");
    store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
  });

  afterEach(() => {
    timers.cleanup();
    logSpy.mockRestore();
  });

  it("does not show auto-select message when stat picked before timer expires", async () => {
    // Pre-fill cards and trigger selection directly to avoid depending on
    // timer ticks in this unit test.
    document.getElementById("player-card").innerHTML =
      '<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>';
    document.getElementById("opponent-card").innerHTML =
      '<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>';

    const playerVal = battleMod.getCardStatValue(document.getElementById("player-card"), "power");
    const opponentVal = battleMod.getCardStatValue(
      document.getElementById("opponent-card"),
      "power"
    );
    const promise = battleMod.handleStatSelection(store, "power", {
      playerVal,
      opponentVal
    });
    await timers.runAllTimersAsync();
    await promise;
    timers.advanceTimersByTime(1000);
    await timers.runAllTimersAsync();
    const messages = mockShowMessage.mock.calls.map((c) => c[0]);
    expect(messages.some((m) => /Time's up! Auto-selecting/.test(m))).toBe(false);
  });
});
