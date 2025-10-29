import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";
import "./commonMocks.js";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";
import { applyMockSetup } from "./mockSetup.js";
import { stallRecoveryJudokaFixtures } from "./stallRecoveryJudokaFixtures.js";

const renderStatsMarkup = (stats) => `
      <ul>
        <li class="stat" data-stat="power"><strong>Power</strong> <span>${stats.power}</span></li>
        <li class="stat" data-stat="speed"><strong>Speed</strong> <span>${stats.speed}</span></li>
        <li class="stat" data-stat="technique"><strong>Technique</strong> <span>${stats.technique}</span></li>
        <li class="stat" data-stat="kumikata"><strong>Kumikata</strong> <span>${stats.kumikata}</span></li>
        <li class="stat" data-stat="newaza"><strong>Newaza</strong> <span>${stats.newaza}</span></li>
      </ul>
    `;

vi.mock("../../../src/helpers/classicBattle/timerService.js", async () => {
  const actual = await vi.importActual("../../../src/helpers/classicBattle/timerService.js");
  return {
    ...actual,
    startTimer: vi.fn().mockResolvedValue(undefined)
  };
});
vi.mock("../../../src/helpers/classicBattle/roundManager.js", async () => {
  const actual = await vi.importActual("../../../src/helpers/classicBattle/roundManager.js");
  return {
    ...actual,
    startCooldown: vi.fn(),
    createBattleStore: () => ({}),
    // Provide a no-op reset for test harness expectations
    _resetForTest: vi.fn()
  };
});

let fetchJsonMock;
let generateRandomCardMock;
let getRandomJudokaMock;
let renderMock;
let playerJudoka;
let opponentJudoka;

describe("classicBattle stalled stat selection recovery", () => {
  let timers;
  beforeEach(() => {
    document.body.innerHTML = "";
    const { playerCard, opponentCard } = createBattleCardContainers();
    const header = createBattleHeader();
    document.body.append(playerCard, opponentCard, header);
    timers = useCanonicalTimers();
    [playerJudoka, opponentJudoka] = stallRecoveryJudokaFixtures;
    fetchJsonMock = vi.fn(async (path) => {
      if (typeof path === "string" && path.endsWith("judoka.json")) {
        return stallRecoveryJudokaFixtures;
      }
      return [];
    });
    generateRandomCardMock = vi.fn(async (_d, _g, container, _pm, cb) => {
      container.innerHTML = renderStatsMarkup(playerJudoka.stats);
      if (cb) cb(playerJudoka);
    });
    getRandomJudokaMock = vi.fn(() => opponentJudoka);
    renderMock = vi.fn(async (judoka) => {
      const el = document.createElement("div");
      const stats = judoka?.stats ?? opponentJudoka.stats;
      el.innerHTML = renderStatsMarkup(stats);
      return el;
    });
    applyMockSetup({
      fetchJsonMock,
      generateRandomCardMock,
      getRandomJudokaMock,
      renderMock,
      currentFlags: { autoSelect: { enabled: true } }
    });
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    timers.cleanup();
    vi.restoreAllMocks();
  });

  it("auto-selects after stall timeout", async () => {
    // Initialize scoreboard to ensure messages work
    const { initScoreboard, resetScoreboard } = await import(
      "../../../src/components/Scoreboard.js"
    );
    const header = document.querySelector("header");
    resetScoreboard();
    initScoreboard(header);

    const battleMod = await import("../../../src/helpers/classicBattle.js");
    await battleMod.__ensureClassicBattleBindings();
    const store = battleMod.createBattleStore();
    store.forceDirectResolution = true;
    battleMod._resetForTest(store);
    await battleMod.startRound(store, battleMod.applyRoundUI);
    store.currentPlayerJudoka = playerJudoka;
    store.currentOpponentJudoka = opponentJudoka;
    store.lastPlayerStats = { ...playerJudoka.stats };
    store.lastOpponentStats = { ...opponentJudoka.stats };
    document.getElementById("player-card").innerHTML = renderStatsMarkup(playerJudoka.stats);
    document.getElementById("opponent-card").innerHTML = renderStatsMarkup(opponentJudoka.stats);
    await battleMod.__triggerStallPromptNow(store);
    expect(document.querySelector("header #round-message").textContent).toMatch(/stalled/i);
    timers.advanceTimersByTime(5000);
    await timers.runAllTimersAsync();
    const score = document.querySelector("header #score-display").textContent;
    expect(score).toBe("You: 1\nOpponent: 0");
  });
});
