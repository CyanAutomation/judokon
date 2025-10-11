import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";
import "./commonMocks.js";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";
import { applyMockSetup } from "./mockSetup.js";

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

describe("classicBattle stalled stat selection recovery", () => {
  let timers;
  beforeEach(() => {
    document.body.innerHTML = "";
    const { playerCard, opponentCard } = createBattleCardContainers();
    const header = createBattleHeader();
    document.body.append(playerCard, opponentCard, header);
    timers = useCanonicalTimers();
    const judokaFixtures = [
      {
        id: 1,
        name: "Test Player",
        country: "USA",
        rank: "Shodan",
        stats: { power: 5 }
      },
      {
        id: 2,
        name: "Test Opponent",
        country: "JPN",
        rank: "Nidan",
        stats: { power: 3 }
      }
    ];
    fetchJsonMock = vi.fn(async (path) => {
      if (typeof path === "string" && path.includes("judoka.json")) {
        return judokaFixtures;
      }
      return [];
    });
    generateRandomCardMock = vi.fn(async (_d, _g, container, _pm, cb) => {
      container.innerHTML = `<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>`;
      if (cb) cb({ id: 1 });
    });
    getRandomJudokaMock = vi.fn(() => ({ id: 2 }));
    renderMock = vi.fn(async () => {
      const el = document.createElement("div");
      el.innerHTML = `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
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
    await battleMod.__triggerStallPromptNow(store);
    expect(document.querySelector("header #round-message").textContent).toMatch(/stalled/i);
    timers.advanceTimersByTime(5000);
    await timers.runAllTimersAsync();
    const score = document.querySelector("header #score-display").textContent;
    expect(score).toBe("You: 1\nOpponent: 0");
  });
});
