/**
 * @vitest-environment jsdom
 */
import { beforeEach, expect, test, vi } from "vitest";
import { createClassicBattleHarness } from "../helpers/integrationHarness.js";
import { createTestController } from "../../src/utils/scheduler.js";

// Enable test controller access
globalThis.__TEST__ = true;

if (!process.env.VITEST) {
}

const STAT_KEYS = ["power", "speed", "technique", "kumikata", "newaza"];

// ============================================================================

// HOISTED MOCK STATE - Shared between vi.mock() factory and tests

// ============================================================================

// This state is used to share configuration between tests and mocks
const roundManagerState = vi.hoisted(() => ({
  store: {}
}));

// ============================================================================
// TOP-LEVEL MOCK REGISTRATIONS - Applied during Vitest module collection
// ============================================================================

vi.mock("../../src/helpers/classicBattle/roundManager.js", () => {
  const startRoundFn = vi.fn(async () => {
    // Store and DOM will be set by test
  });

  return {
    createBattleStore: () => roundManagerState.store,
    startRound: startRoundFn,
    startCooldown: vi.fn(),
    __setStore: (store) => {
      roundManagerState.store = store;
    }
  };
});

vi.mock("../../src/helpers/timerUtils.js", () => ({
  createCountdownTimer: (duration, options = {}) => ({
    start: async () => {
      // Call onExpired immediately and wait for it to complete
      await options.onExpired?.();
    },
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn()
  }),
  getDefaultTimer: () => 1
}));

vi.mock("../../src/helpers/classicBattle/roundResolver.js", () => {
  const computeRoundResultSpy = vi.fn(async (s, stat, playerVal, opponentVal) => ({
    matchEnded: false,
    outcome: playerVal >= opponentVal ? "winPlayer" : "winOpponent",
    playerScore: playerVal >= opponentVal ? 1 : 0,
    opponentScore: playerVal >= opponentVal ? 0 : 1
  }));
  return {
    computeRoundResult: computeRoundResultSpy
  };
});

vi.mock("../../src/helpers/setupScoreboard.js", () => ({
  setupScoreboard: vi.fn(),
  cleanupScoreboard: vi.fn(),
  showMessage: vi.fn(),
  clearMessage: vi.fn(),
  showTemporaryMessage: vi.fn(() => () => {}),
  clearTimer: vi.fn(),
  updateTimer: vi.fn(),
  showAutoSelect: vi.fn(),
  updateScore: vi.fn((player, opponent) => {
    const el = document.getElementById("score-display");
    if (!el) return;
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
  updateRoundCounter: vi.fn(),
  clearRoundCounter: vi.fn(),
  scoreboard: {
    reset: vi.fn()
  }
}));

vi.mock("../../src/helpers/BattleEngine.js", () => ({
  createBattleEngine: vi.fn(),
  STATS: STAT_KEYS,
  on: vi.fn(),
  getRoundsPlayed: () => 0,
  isMatchEnded: vi.fn(() => false),
  getScores: vi.fn(() => ({ playerScore: 0, opponentScore: 0 }))
}));

vi.mock("../../src/helpers/classicBattle/snackbar.js", () => ({
  showSelectionPrompt: vi.fn(),
  getOpponentDelay: () => 0,
  setOpponentDelay: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/statButtons.js", () => ({
  setStatButtonsEnabled: vi.fn(),
  resolveStatButtonsReady: vi.fn(),
  disableStatButtons: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/uiEventHandlers.js", () => ({
  bindUIHelperEventHandlersDynamic: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/endModal.js", () => ({
  showEndModal: vi.fn()
}));

vi.mock("../../src/helpers/featureFlags.js", () => ({
  initFeatureFlags: vi.fn(async () => {}),
  isEnabled: vi.fn(() => false),
  featureFlagsEmitter: new EventTarget()
}));

vi.mock("../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: vi.fn()
}));

vi.mock("../../src/helpers/i18n.js", () => ({
  t: (key) => key
}));

vi.mock("../../src/helpers/classicBattle/battleEvents.js", () => ({
  onBattleEvent: vi.fn(),
  emitBattleEvent: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/roundSelectModal.js", () => ({
  initRoundSelectModal: vi.fn(async (onStart) => {
    await onStart();
  })
}));

vi.mock("../../src/helpers/classicBattle/selectionHandler.js", () => ({
  handleStatSelection: vi.fn(async () => ({
    matchEnded: false,
    outcome: "winPlayer",
    playerScore: 4,
    opponentScore: 1
  })),
  getPlayerAndOpponentValues: vi.fn((stat, playerCard, opponentCard, { store } = {}) => {
    const readFromStore = (sideStoreStats, key) => {
      const value = sideStoreStats?.[key];
      return Number.isFinite(Number(value)) ? Number(value) : undefined;
    };

    const selectedStatIndex = STAT_KEYS.indexOf(stat);

    const readFromDom = (selector) => {
      const spans = document.querySelectorAll(`${selector} li.stat span`);
      if (selectedStatIndex >= 0 && spans[selectedStatIndex]) {
        const parsed = Number(spans[selectedStatIndex].textContent);
        return Number.isFinite(parsed) ? parsed : 0;
      }
      return 0;
    };

    const playerVal =
      readFromStore(store?.currentPlayerJudoka?.stats, stat) ?? readFromDom("#player-card");
    const opponentVal =
      readFromStore(store?.currentOpponentJudoka?.stats, stat) ?? readFromDom("#opponent-card");

    return { playerVal, opponentVal };
  }),
  isOrchestratorActive: vi.fn(() => false)
}));

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function renderCard(id) {
  const items = STAT_KEYS.map(() => '<li class="stat"><span>0</span></li>').join("");
  return `<section id="${id}"><ul>${items}</ul></section>`;
}

function setupDom() {
  document.body.innerHTML = `
    ${renderCard("player-card")}
    ${renderCard("opponent-card")}
    <div id="score-display"></div>
    <div id="stat-buttons"></div>
    <button id="next-button"></button>
    <div id="round-counter"></div>
  `;
}

// ============================================================================
// TEST SETUP / TEARDOWN
// ============================================================================

beforeEach(async () => {
  vi.clearAllMocks();
  roundManagerState.store = {};
});

// ============================================================================
// TESTS
// ============================================================================

test("score updates after auto-select on expiry", async () => {
  setupDom();
  const playerStats = { power: 10, speed: 55, technique: 10, kumikata: 10, newaza: 10 };
  const opponentStats = { power: 8, speed: 30, technique: 8, kumikata: 8, newaza: 8 };

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

  const harness = createClassicBattleHarness({});
  await harness.setup();

  const { computeRoundResult } = await import("../../src/helpers/classicBattle/roundResolver.js");
  const { startRound } = await import("../../src/helpers/classicBattle/roundManager.js");
  const { initRoundSelectModal } = await import(
    "../../src/helpers/classicBattle/roundSelectModal.js"
  );

  roundManagerState.store = store;

  // Configure roundManager startRound to populate DOM
  startRound.mockImplementation(async () => {
    store.currentPlayerJudoka = { stats: playerStats };
    store.currentOpponentJudoka = { stats: opponentStats };
    const playerSpans = document.querySelectorAll("#player-card li.stat span");
    const opponentSpans = document.querySelectorAll("#opponent-card li.stat span");
    STAT_KEYS.forEach((key, index) => {
      if (playerSpans[index]) {
        playerSpans[index].textContent = String(playerStats[key] ?? 0);
      }
      if (opponentSpans[index]) {
        opponentSpans[index].textContent = String(opponentStats[key] ?? 0);
      }
    });
  });

  const mod = await import("../../src/pages/battleClassic.init.js");
  await mod.init();
  expect(initRoundSelectModal).toHaveBeenCalled();
  expect(startRound).toHaveBeenCalled();
  await harness.timerControl.runAllTimersAsync();
  await Promise.resolve();

  expect(computeRoundResult).toHaveBeenCalled();
  const [, stat, playerVal, opponentVal] = computeRoundResult.mock.calls[0];
  expect(stat).toBe("speed");
  expect(playerVal).toBe(playerStats.speed);
  expect(opponentVal).toBe(opponentStats.speed);

  harness.cleanup();
});

test("timer expiry falls back to store stats when DOM is obscured", async () => {
  setupDom();
  const playerStats = { power: 5, speed: 70, technique: 5, kumikata: 5, newaza: 5 };
  const opponentStats = { power: 4, speed: 12, technique: 4, kumikata: 4, newaza: 4 };

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

  const harness = createClassicBattleHarness({});
  await harness.setup();

  const { computeRoundResult } = await import("../../src/helpers/classicBattle/roundResolver.js");
  const roundManagerMod = await import("../../src/helpers/classicBattle/roundManager.js");

  roundManagerMod.__setStore(store);

  const { startRound } = roundManagerMod;
  startRound.mockImplementation(async () => {
    store.currentPlayerJudoka = { stats: playerStats };
    store.currentOpponentJudoka = { stats: opponentStats };
    const playerSpans = document.querySelectorAll("#player-card li.stat span");
    const opponentSpans = document.querySelectorAll("#opponent-card li.stat span");
    STAT_KEYS.forEach((key, index) => {
      if (playerSpans[index]) {
        playerSpans[index].textContent = "?";
      }
      if (opponentSpans[index]) {
        opponentSpans[index].textContent = "?";
      }
    });
  });

  const mod = await import("../../src/pages/battleClassic.init.js");
  await mod.init();
  await harness.timerControl.runAllTimersAsync();
  await Promise.resolve();

  expect(computeRoundResult).toHaveBeenCalled();
  const [, stat, playerVal, opponentVal] = computeRoundResult.mock.calls[0];
  expect(stat).toBe("speed");
  expect(playerVal).toBe(playerStats.speed);
  expect(opponentVal).toBe(opponentStats.speed);

  harness.cleanup();
});

test("scoreboard reconciles directly to round result", async () => {
  setupDom();
  const statContainer = document.createElement("div");
  statContainer.id = "stat-buttons";
  const statKeys = ["power", "speed", "technique", "kumikata", "newaza"];
  statKeys.forEach((stat) => {
    const btn = document.createElement("button");
    btn.dataset.stat = stat;
    btn.textContent = stat;
    statContainer.appendChild(btn);
  });
  document.body.appendChild(statContainer);

  const playerStats = { power: 3, speed: 40, technique: 3, kumikata: 3, newaza: 3 };
  const opponentStats = { power: 2, speed: 10, technique: 2, kumikata: 2, newaza: 2 };

  const roundManagerMod = await import("../../src/helpers/classicBattle/roundManager.js");
  const store = {
    selectionMade: false,
    stallTimeoutMs: 35000,
    autoSelectId: null,
    playerChoice: null,
    playerCardEl: null,
    opponentCardEl: null,
    statButtonEls: null,
    currentPlayerJudoka: { stats: playerStats },
    currentOpponentJudoka: { stats: opponentStats }
  };
  roundManagerMod.__setStore(store);

  const harness = createClassicBattleHarness({ useRafMock: false });
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
  testController.advanceFrame();
  await Promise.resolve();
  await Promise.resolve();

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

  const roundManagerMod = await import("../../src/helpers/classicBattle/roundManager.js");
  const store = {
    selectionMade: false,
    stallTimeoutMs: 35000,
    autoSelectId: null,
    playerChoice: null,
    playerCardEl: null,
    opponentCardEl: null,
    statButtonEls: null,
    currentPlayerJudoka: { stats: playerStats },
    currentOpponentJudoka: { stats: opponentStats }
  };
  roundManagerMod.__setStore(store);

  const harness = createClassicBattleHarness({});
  await harness.setup();

  const { onBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");
  const { showEndModal } = await import("../../src/helpers/classicBattle/endModal.js");
  const mod = await import("../../src/pages/battleClassic.init.js");
  await mod.init();

  const [, handler] =
    onBattleEvent.mock.calls.find(([eventName]) => eventName === "round.evaluated") || [];
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
