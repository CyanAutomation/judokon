import { describe, it, expect, vi, beforeEach } from "vitest";
import { setTestMode } from "../../../src/helpers/testModeUtils.js";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";
import "./commonMocks.js";
import { createBattleCardContainers, createBattleHeader } from "../../utils/testUtils.js";
import { createRoundMessage, createSnackbarContainer, createTimerNodes } from "./domUtils.js";
const { promptReadyMock } = vi.hoisted(() => ({
  promptReadyMock: vi.fn(() => true)
}));

vi.mock("../../../src/helpers/classicBattle/uiHelpers.js", async () => {
  const actual = await vi.importActual("../../../src/helpers/classicBattle/uiHelpers.js");
  return {
    ...actual,
    renderOpponentCard: vi.fn(),
    disableNextRoundButton: vi.fn(),
    enableNextRoundButton: vi.fn()
  };
});
vi.mock("../../../src/helpers/classicBattle/debugPanel.js", () => ({
  updateDebugPanel: vi.fn()
}));

vi.mock("../../../src/helpers/classicBattle/opponentController.js", () => ({
  getOpponentCardData: vi.fn().mockResolvedValue(null)
}));

vi.mock("../../../src/helpers/classicBattle/opponentPromptTracker.js", async () => {
  const actual = await vi.importActual(
    "../../../src/helpers/classicBattle/opponentPromptTracker.js"
  );
  return {
    ...actual,
    isOpponentPromptReady: promptReadyMock
  };
});

async function selectPower(battleMod, store) {
  const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
  const playerVal = battleMod.getCardStatValue(document.getElementById("player-card"), "power");
  const opponentVal = battleMod.getCardStatValue(document.getElementById("opponent-card"), "power");
  const p = battleMod.handleStatSelection(store, "power", {
    playerVal,
    opponentVal,
    forceDirectResolution: true
  });
  await vi.advanceTimersByTimeAsync(100);
  await p;
  return { randomSpy };
}

function populateCards() {
  document.getElementById("player-card").innerHTML =
    '<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>';
  document.getElementById("opponent-card").innerHTML =
    '<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>';
}

describe("turn-based: no countdown timer after stat selection", () => {
  let battleMod;
  let store;
  let timers;

  afterEach(() => {
    promptReadyMock.mockReset().mockReturnValue(true);
    if (timers) {
      timers.cleanup();
      timers = null;
    }
    if (typeof window !== "undefined") {
      delete window.__NEXT_ROUND_COOLDOWN_MS;
    }
  });

  beforeEach(async () => {
    document.body.innerHTML = "";
    setTestMode(false);
    timers = useCanonicalTimers();
    const { playerCard, opponentCard } = createBattleCardContainers();
    const header = createBattleHeader();
    document.body.append(playerCard, opponentCard, header);
    createRoundMessage("round-result");
    createTimerNodes();
    document.body.innerHTML += '<div id="stat-buttons"><button data-stat="power"></button></div>';
    createSnackbarContainer();
    const { initClassicBattleTest } = await import("./initClassicBattle.js");
    battleMod = await initClassicBattleTest({ afterMock: true });
    store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
    const { bindUIServiceEventHandlersOnce } = await import(
      "../../../src/helpers/classicBattle/uiService.js"
    );
    bindUIServiceEventHandlersOnce();

    const { bindRoundUIEventHandlersDynamic } = await import(
      "../../../src/helpers/classicBattle/roundUI.js"
    );
    bindRoundUIEventHandlersDynamic();

    if (typeof window !== "undefined") {
      window.__FF_OVERRIDES = {
        ...(window.__FF_OVERRIDES || {}),
        enableTestMode: false,
        skipRoundCooldown: false
      };
      window.__NEXT_ROUND_COOLDOWN_MS = 3000;
    }
  });

  it("does NOT start a countdown timer after stat selection (turn-based mode)", async () => {
    populateCards();
    const flushPendingTimers = async (rounds = 3) => {
      for (let i = 0; i < rounds; i += 1) {
        await vi.runOnlyPendingTimersAsync();
      }
    };
    const { scoreboard } = await import("../../../src/helpers/setupScoreboard.js");
    const updateTimerSpy = vi.spyOn(scoreboard, "updateTimer");
    const { initClassicBattleOrchestrator, dispatchBattleEvent } = await import(
      "../../../src/helpers/classicBattle/orchestrator.js"
    );
    store.orchestrator = await initClassicBattleOrchestrator(store, undefined, {});
    await dispatchBattleEvent("startClicked");
    await dispatchBattleEvent("ready");
    await dispatchBattleEvent("cardsRevealed");
    await flushPendingTimers();

    const previousMinDuration =
      typeof window !== "undefined" ? window.__MIN_OPPONENT_MESSAGE_DURATION_MS : undefined;
    if (typeof window !== "undefined") {
      window.__MIN_OPPONENT_MESSAGE_DURATION_MS = 0;
    }
    let randomSpy;
    try {
      ({ randomSpy } = await selectPower(battleMod, store));
    } finally {
      if (typeof window !== "undefined") {
        if (previousMinDuration === undefined) {
          delete window.__MIN_OPPONENT_MESSAGE_DURATION_MS;
        } else {
          window.__MIN_OPPONENT_MESSAGE_DURATION_MS = previousMinDuration;
        }
      }
    }
    await flushPendingTimers();

    // Advance time – in turn-based mode no countdown should tick
    await vi.advanceTimersByTimeAsync(4000);
    await flushPendingTimers();

    const timerEl = document.querySelector("#next-round-timer");
    const valueNode = timerEl?.querySelector('[data-part="value"]');
    const timerText = valueNode?.textContent || "";

    // In turn-based mode the timer element should be empty or hidden, not counting down
    const hasCountdown = /^(\d+s|\d+)$/.test(timerText.trim());
    expect(hasCountdown).toBe(false);

    // updateTimer should NOT have been called with a decreasing series (no countdown)
    const timerUpdateValues = updateTimerSpy.mock.calls.map(([v]) => v).filter(Number.isFinite);
    const hasDecreasingSequence =
      timerUpdateValues.length >= 2 &&
      timerUpdateValues.some((v, i) => i > 0 && v < timerUpdateValues[i - 1]);
    expect(hasDecreasingSequence).toBe(false);

    updateTimerSpy.mockRestore();
    randomSpy.mockRestore();
  });
});

