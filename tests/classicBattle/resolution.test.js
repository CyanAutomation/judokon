/**
 * @vitest-environment jsdom
 */
import { beforeEach, expect, test, vi } from "vitest";
import { createClassicBattleHarness } from "../helpers/integrationHarness.js";
import { createTestController } from "../../src/utils/scheduler.js";

// Enable test controller access
globalThis.__TEST__ = true;

if (!process.env.VITEST) {
  process.env.VITEST = "true";
}

const STAT_KEYS = ["power", "speed", "technique", "kumikata", "newaza"];

let computeRoundResultMock;

function renderCard(id) {
  const items = STAT_KEYS.map(() => '<li class="stat"><span>0</span></li>').join("");
  return `<section id="${id}"><ul>${items}</ul></section>`;
}

function setupDom() {
  document.body.innerHTML = `
    ${renderCard("player-card")}
    ${renderCard("opponent-card")}
    <div id="score-display"></div>
    <button id="next-button"></button>
    <div id="round-counter"></div>
  `;
}

function mockModules({ playerStats, opponentStats, domOverrides } = {}) {
  const store = {
    selectionMade: false,
    stallTimeoutMs: 35000,
    autoSelectId: null,
    playerChoice: null,
    playerCardEl: null,
    opponentCardEl: null,
    statButtonEls: null,
    currentPlayerJudoka: null,
    currentOpponentJudoka: null
  };

  computeRoundResultMock = vi.fn(async (s, stat, playerVal, opponentVal) => ({
    matchEnded: false,
    outcome: playerVal >= opponentVal ? "winPlayer" : "winOpponent",
    playerScore: playerVal >= opponentVal ? 1 : 0,
    opponentScore: playerVal >= opponentVal ? 0 : 1
  }));

  const mocks = {};

  mocks["../../src/helpers/classicBattle/roundManager.js"] = {
    createBattleStore: () => store,
    startRound: vi.fn(async () => {
      store.currentPlayerJudoka = { stats: playerStats };
      store.currentOpponentJudoka = { stats: opponentStats };
      const playerSpans = document.querySelectorAll("#player-card li.stat span");
      const opponentSpans = document.querySelectorAll("#opponent-card li.stat span");
      STAT_KEYS.forEach((key, index) => {
        const playerText = domOverrides?.player?.[key];
        const opponentText = domOverrides?.opponent?.[key];
        if (playerSpans[index]) {
          playerSpans[index].textContent = playerText ?? String(playerStats[key] ?? 0);
        }
        if (opponentSpans[index]) {
          opponentSpans[index].textContent = opponentText ?? String(opponentStats[key] ?? 0);
        }
      });
    }),
    startCooldown: vi.fn()
  };

  mocks["../../src/helpers/timerUtils.js"] = {
    createCountdownTimer: (duration, options = {}) => ({
      start: () => Promise.resolve(options.onExpired?.()),
      stop: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn()
    }),
    getDefaultTimer: () => 1
  };

  mocks["../../src/helpers/classicBattle/roundResolver.js"] = {
    computeRoundResult: computeRoundResultMock
  };

  mocks["../../src/helpers/setupScoreboard.js"] = {
    setupScoreboard: vi.fn(),
    updateScore: vi.fn((player, opponent) => {
      const el = document.getElementById("score-display");
      if (!el) return;
      // Clear existing content and rebuild with proper DOM structure
      el.innerHTML = "";
      const playerSpan = document.createElement("span");
      playerSpan.dataset.side = "player";
      playerSpan.innerHTML = `<span data-part="label">You:</span> <span data-part="value">${player}</span>`;
      const opponentSpan = document.createElement("span");
      opponentSpan.dataset.side = "opponent";
      opponentSpan.innerHTML = `<span data-part="label">Opponent:</span> <span data-part="value">${opponent}</span>`;
      el.appendChild(playerSpan);
      el.appendChild(document.createTextNode("\n"));
      el.appendChild(opponentSpan);
    }),
    updateRoundCounter: vi.fn()
  };

  mocks["../../src/helpers/battleEngineFacade.js"] = {
    createBattleEngine: vi.fn(),
    STATS: STAT_KEYS,
    on: vi.fn(),
    getRoundsPlayed: () => 0,
    isMatchEnded: vi.fn(() => false),
    getScores: vi.fn(() => ({ playerScore: 0, opponentScore: 0 }))
  };

  mocks["../../src/helpers/classicBattle/snackbar.js"] = {
    showSelectionPrompt: vi.fn(),
    getOpponentDelay: () => 0,
    setOpponentDelay: vi.fn()
  };

  mocks["../../src/helpers/classicBattle/statButtons.js"] = {
    setStatButtonsEnabled: vi.fn(),
    resolveStatButtonsReady: vi.fn(),
    disableStatButtons: vi.fn()
  };

  mocks["../../src/helpers/classicBattle/uiEventHandlers.js"] = {
    bindUIHelperEventHandlersDynamic: vi.fn()
  };

  mocks["../../src/helpers/classicBattle/endModal.js"] = {
    showEndModal: vi.fn()
  };

  mocks["../../src/helpers/featureFlags.js"] = {
    initFeatureFlags: vi.fn(async () => {}),
    isEnabled: vi.fn(() => false),
    featureFlagsEmitter: new EventTarget()
  };

  mocks["../../src/helpers/showSnackbar.js"] = {
    showSnackbar: vi.fn()
  };

  mocks["../../src/helpers/i18n.js"] = {
    t: (key) => key
  };

  mocks["../../src/helpers/classicBattle/battleEvents.js"] = {
    onBattleEvent: vi.fn(),
    emitBattleEvent: vi.fn()
  };

  mocks["../../src/helpers/classicBattle/roundSelectModal.js"] = {
    initRoundSelectModal: vi.fn(async (onStart) => {
      await onStart();
    })
  };

  return mocks;
}

beforeEach(() => {
  vi.clearAllMocks();
  computeRoundResultMock = undefined;
});

test("score updates after auto-select on expiry", async () => {
  setupDom();
  const playerStats = { power: 10, speed: 55, technique: 10, kumikata: 10, newaza: 10 };
  const opponentStats = { power: 8, speed: 30, technique: 8, kumikata: 8, newaza: 8 };
  const mocks = mockModules({ playerStats, opponentStats });
  const harness = createClassicBattleHarness({ mocks });
  await harness.setup();
  const mod = await import("../../src/pages/battleClassic.init.js");
  await mod.init();
  await harness.timerControl.runAllTimersAsync();
  await Promise.resolve();
  expect(computeRoundResultMock).toHaveBeenCalled();
  const [, stat, playerVal, opponentVal] = computeRoundResultMock.mock.calls[0];
  expect(stat).toBe("speed");
  expect(playerVal).toBe(playerStats.speed);
  expect(opponentVal).toBe(opponentStats.speed);
  harness.cleanup();
});

test("timer expiry falls back to store stats when DOM is obscured", async () => {
  setupDom();
  const playerStats = { power: 5, speed: 70, technique: 5, kumikata: 5, newaza: 5 };
  const opponentStats = { power: 4, speed: 12, technique: 4, kumikata: 4, newaza: 4 };
  const domOverrides = {
    player: { speed: "?" },
    opponent: { speed: "?" }
  };
  const mocks = mockModules({ playerStats, opponentStats, domOverrides });
  const harness = createClassicBattleHarness({ mocks });
  await harness.setup();
  const mod = await import("../../src/pages/battleClassic.init.js");
  await mod.init();
  await harness.timerControl.runAllTimersAsync();
  await Promise.resolve();
  expect(computeRoundResultMock).toHaveBeenCalled();
  const [, stat, playerVal, opponentVal] = computeRoundResultMock.mock.calls[0];
  expect(stat).toBe("speed");
  expect(playerVal).toBe(playerStats.speed);
  expect(opponentVal).toBe(opponentStats.speed);
  harness.cleanup();
});

test("scoreboard reconciles directly to round result", async () => {
  setupDom();
  const statContainer = document.createElement("div");
  statContainer.id = "stat-buttons";
  document.body.appendChild(statContainer);

  const playerStats = { power: 3, speed: 40, technique: 3, kumikata: 3, newaza: 3 };
  const opponentStats = { power: 2, speed: 10, technique: 2, kumikata: 2, newaza: 2 };
  const mocks = mockModules({ playerStats, opponentStats });

  const mockedSelection = {
    handleStatSelection: vi.fn(async () => ({
      matchEnded: false,
      outcome: "winPlayer",
      playerScore: 4,
      opponentScore: 1
    })),
    getPlayerAndOpponentValues: vi.fn(() => ({ playerVal: 9, opponentVal: 3 })),
    isOrchestratorActive: vi.fn(() => false)
  };

  mocks["../../src/helpers/classicBattle/selectionHandler.js"] = mockedSelection;

  const harness = createClassicBattleHarness({ useRafMock: false, mocks });
  await harness.setup();
  const testController = createTestController();

  const { updateScore } = await import("../../src/helpers/setupScoreboard.js");
  const mod = await import("../../src/pages/battleClassic.init.js");

  await mod.init();

  const scoreEl = document.getElementById("score-display");
  expect(scoreEl).not.toBeNull();
  const buttons = document.querySelectorAll("#stat-buttons button[data-stat]");
  expect(buttons.length).toBeGreaterThan(0);

  buttons[0].click();
  // Advance frames to execute any RAF callbacks from the click
  testController.advanceFrame();
  await Promise.resolve();
  await Promise.resolve();

  expect(mockedSelection.handleStatSelection).toHaveBeenCalled();
  expect(updateScore).toHaveBeenLastCalledWith(4, 1);
  const normalizedScore = scoreEl.textContent.replace(/\s+/g, " ").trim();
  expect(normalizedScore).toBe("You: 4 Opponent: 1");
  expect(normalizedScore).not.toBe("You: 1 Opponent: 0");
  expect(scoreEl.querySelector('[data-side="player"]')).not.toBeNull();
  expect(scoreEl.querySelector('[data-side="opponent"]')).not.toBeNull();

  testController.dispose();
  harness.cleanup();
});

test("match end forwards outcome to end modal", async () => {
  setupDom();
  const playerStats = { power: 9, speed: 9, technique: 9, kumikata: 9, newaza: 9 };
  const opponentStats = { power: 1, speed: 1, technique: 1, kumikata: 1, newaza: 1 };
  const mocks = mockModules({ playerStats, opponentStats });
  const harness = createClassicBattleHarness({ mocks });
  await harness.setup();
  const { onBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");
  const { showEndModal } = await import("../../src/helpers/classicBattle/endModal.js");
  const mod = await import("../../src/pages/battleClassic.init.js");
  await mod.init();

  const [, handler] =
    onBattleEvent.mock.calls.find(([eventName]) => eventName === "roundResolved") || [];
  expect(typeof handler).toBe("function");

  handler({
    detail: {
      result: {
        matchEnded: true,
        outcome: "quit",
        playerScore: 3,
        opponentScore: 0
      }
    }
  });

  expect(showEndModal).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      outcome: "quit",
      scores: { player: 3, opponent: 0 }
    })
  );
  harness.cleanup();
});
