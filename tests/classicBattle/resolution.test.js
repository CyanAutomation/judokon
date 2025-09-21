/**
 * @vitest-environment jsdom
 */
import { beforeEach, expect, test, vi } from "vitest";

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

  vi.doMock("../../src/helpers/classicBattle/roundManager.js", () => ({
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
  }));

  vi.doMock("../../src/helpers/timerUtils.js", () => ({
    createCountdownTimer: (duration, options = {}) => ({
      start: () => Promise.resolve(options.onExpired?.()),
      stop: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn()
    }),
    getDefaultTimer: () => 1
  }));

  vi.doMock("../../src/helpers/classicBattle/roundResolver.js", () => ({
    computeRoundResult: computeRoundResultMock
  }));

  vi.doMock("../../src/helpers/setupScoreboard.js", () => ({
    setupScoreboard: vi.fn(),
    updateScore: vi.fn((player, opponent) => {
      const el = document.getElementById("score-display");
      if (el) el.textContent = `You: ${player} Opponent: ${opponent}`;
    }),
    updateRoundCounter: vi.fn()
  }));

  vi.doMock("../../src/helpers/battleEngineFacade.js", () => ({
    createBattleEngine: vi.fn(),
    STATS: STAT_KEYS,
    on: vi.fn(),
    getRoundsPlayed: () => 0
  }));

  vi.doMock("../../src/helpers/classicBattle/snackbar.js", () => ({
    showSelectionPrompt: vi.fn(),
    getOpponentDelay: () => 0
  }));

  vi.doMock("../../src/helpers/classicBattle/statButtons.js", () => ({
    setStatButtonsEnabled: vi.fn(),
    resolveStatButtonsReady: vi.fn()
  }));

  vi.doMock("../../src/helpers/classicBattle/quitModal.js", () => ({
    quitMatch: vi.fn()
  }));

  vi.doMock("../../src/helpers/classicBattle/uiEventHandlers.js", () => ({
    bindUIHelperEventHandlersDynamic: vi.fn()
  }));

  vi.doMock("../../src/helpers/classicBattle/debugPanel.js", () => ({
    initDebugPanel: vi.fn()
  }));

  vi.doMock("../../src/helpers/classicBattle/endModal.js", () => ({
    showEndModal: vi.fn()
  }));

  vi.doMock("../../src/helpers/classicBattle/scoreboardAdapter.js", () => ({
    initScoreboardAdapter: vi.fn()
  }));

  vi.doMock("../../src/helpers/classicBattle/engineBridge.js", () => ({
    bridgeEngineEvents: vi.fn()
  }));

  vi.doMock("../../src/helpers/featureFlags.js", () => ({
    initFeatureFlags: vi.fn(async () => {})
  }));

  vi.doMock("../../src/helpers/testApi.js", () => ({
    exposeTestAPI: vi.fn()
  }));

  vi.doMock("../../src/helpers/showSnackbar.js", () => ({
    showSnackbar: vi.fn()
  }));

  vi.doMock("../../src/helpers/i18n.js", () => ({
    t: (key) => key
  }));

  vi.doMock("../../src/helpers/classicBattle/uiHelpers.js", () => ({
    removeBackdrops: vi.fn(),
    enableNextRoundButton: vi.fn(),
    disableNextRoundButton: vi.fn(),
    showFatalInitError: vi.fn()
  }));

  vi.doMock("../../src/helpers/classicBattle/timerService.js", () => ({
    startTimer: vi.fn(async () => null),
    onNextButtonClick: vi.fn()
  }));

  vi.doMock("../../src/helpers/classicBattle/battleEvents.js", () => ({
    onBattleEvent: vi.fn(),
    emitBattleEvent: vi.fn()
  }));

  vi.doMock("../../src/helpers/classicBattle/setupScheduler.js", () => ({
    default: vi.fn()
  }));

  vi.doMock("../../src/helpers/classicBattle/roundSelectModal.js", () => ({
    initRoundSelectModal: vi.fn(async (onStart) => {
      await onStart();
    })
  }));
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  computeRoundResultMock = undefined;
});

test("score updates after auto-select on expiry", async () => {
  setupDom();
  const playerStats = { power: 10, speed: 55, technique: 10, kumikata: 10, newaza: 10 };
  const opponentStats = { power: 8, speed: 30, technique: 8, kumikata: 8, newaza: 8 };
  mockModules({ playerStats, opponentStats });
  const mod = await import("../../src/pages/battleClassic.init.js");
  await mod.init();
  await Promise.resolve();
  expect(computeRoundResultMock).toHaveBeenCalled();
  const [, stat, playerVal, opponentVal] = computeRoundResultMock.mock.calls[0];
  expect(stat).toBe("speed");
  expect(playerVal).toBe(playerStats.speed);
  expect(opponentVal).toBe(opponentStats.speed);
});

test("timer expiry falls back to store stats when DOM is obscured", async () => {
  setupDom();
  const playerStats = { power: 5, speed: 70, technique: 5, kumikata: 5, newaza: 5 };
  const opponentStats = { power: 4, speed: 12, technique: 4, kumikata: 4, newaza: 4 };
  const domOverrides = {
    player: { speed: "?" },
    opponent: { speed: "?" }
  };
  mockModules({ playerStats, opponentStats, domOverrides });
  const mod = await import("../../src/pages/battleClassic.init.js");
  await mod.init();
  await Promise.resolve();
  expect(computeRoundResultMock).toHaveBeenCalled();
  const [, stat, playerVal, opponentVal] = computeRoundResultMock.mock.calls[0];
  expect(stat).toBe("speed");
  expect(playerVal).toBe(playerStats.speed);
  expect(opponentVal).toBe(opponentStats.speed);
});
