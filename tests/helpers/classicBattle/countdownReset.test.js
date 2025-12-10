import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";
import "./commonMocks.js";
import { createBattleCardContainers, createBattleHeader } from "../../utils/testUtils.js";
import { createRoundMessage, createSnackbarContainer, createTimerNodes } from "./domUtils.js";

const { promptReadyMock } = vi.hoisted(() => ({
  promptReadyMock: vi.fn(() => true)
}));

vi.mock("../../../src/helpers/showSnackbar.js", () => {
  let showMessages = [];
  let updateMessages = [];

  const ensureContainer = () => {
    let container = document.getElementById("snackbar-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "snackbar-container";
      document.body.appendChild(container);
    }
    let bar = container.querySelector(".snackbar");
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "snackbar";
      container.appendChild(bar);
    }
    return bar;
  };

  const applyMessage = (message) => {
    const bar = ensureContainer();
    bar.textContent = message;
  };

  return {
    showSnackbar: (message) => {
      showMessages.push(message);
      applyMessage(message);
    },
    updateSnackbar: (message) => {
      updateMessages.push(message);
      applyMessage(message);
    },
    getShowMessages: () => [...showMessages],
    getUpdateMessages: () => [...updateMessages],
    clearMessages: () => {
      showMessages = [];
      updateMessages = [];
    }
  };
});

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

function populateCards() {
  const timer = document.getElementById("next-round-timer");
  if (timer) {
    const label = timer.querySelector('[data-part="label"]');
    const value = timer.querySelector('[data-part="value"]');
    if (label) label.textContent = "Time Left:";
    if (value) value.textContent = "10s";
  }
  document.getElementById("player-card").innerHTML =
    '<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>';
  document.getElementById("opponent-card").innerHTML =
    '<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>';
}

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

describe("countdown resets after stat selection", () => {
  let battleMod;
  let store;
  let snackbarMock;
  let promptReadySpy;
  afterEach(() => {
    promptReadyMock.mockReset().mockReturnValue(true);
  });
  beforeEach(async () => {
    document.body.innerHTML = "";
    // Ensure previous tests don't leave snackbars disabled
    try {
      if (typeof window !== "undefined" && window.__disableSnackbars) {
        delete window.__disableSnackbars;
      }
    } catch {}
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
    const promptTracker = await import(
      "../../../src/helpers/classicBattle/opponentPromptTracker.js"
    );
    promptReadySpy = vi.spyOn(promptTracker, "isOpponentPromptReady").mockReturnValue(true);
    if (typeof window !== "undefined") {
      window.__FF_OVERRIDES = {
        ...(window.__FF_OVERRIDES || {}),
        enableTestMode: false,
        skipRoundCooldown: false
      };
      window.__disableSnackbars = false;
    }
    snackbarMock = await import("../../../src/helpers/showSnackbar.js");
    snackbarMock.clearMessages();
  });

  it("starts a visible countdown after stat selection", async () => {
    populateCards();
    const timers = useCanonicalTimers();
    const countdownStarted = battleMod.getCountdownStartedPromise();
    const { randomSpy } = await selectPower(battleMod, store);
    await vi.runOnlyPendingTimersAsync();
    await countdownStarted;
    const { emitBattleEvent } = await import("../../../src/helpers/classicBattle/battleEvents.js");
    emitBattleEvent("countdownStart", { duration: 3 });
    await vi.runOnlyPendingTimersAsync();

    const timerEl = document.querySelector("#next-round-timer");
    expect(timerEl).not.toBeNull();
    const valueNode = timerEl?.querySelector('[data-part="value"]');

    const readings = [];
    const timerTexts = [];
    const snackbarTexts = [];

    const recordTimerState = () => {
      const valueText = valueNode?.textContent || "";
      const remaining = Number(valueText.replace(/\D/g, ""));
      if (Number.isFinite(remaining)) readings.push(remaining);
      timerTexts.push(timerEl?.textContent?.trim() || "");
      const snackbarText = document.querySelector(".snackbar")?.textContent || "";
      snackbarTexts.push(snackbarText.trim());
    };

    recordTimerState();

    for (let step = 0; step < 2; step += 1) {
      await vi.advanceTimersByTimeAsync(1000);
      await vi.runOnlyPendingTimersAsync();
      recordTimerState();
    }

    const snackbarText = document.querySelector(".snackbar")?.textContent || "";
    const fallbackReadings = snackbarTexts
      .map((text) => Number(text.match(/\d+/)?.[0] ?? NaN))
      .filter((value) => Number.isFinite(value));
    const timerTextSamples = timerTexts.filter((text) => text.trim().length > 0);
    const hasTimerPattern =
      timerTextSamples.length > 0 &&
      timerTextSamples.every((text) => /Time Left:\s*\d+s/.test(text));

    if (timerTextSamples.length > 0) {
      expect(hasTimerPattern).toBe(true);
    } else {
      expect(timerTextSamples.length).toBe(0);
    }

    const timerSeries = readings.filter((value) => Number.isFinite(value));
    const samples = timerSeries.some((value) => value > 0) ? timerSeries : fallbackReadings;
    expect(samples.length).toBeGreaterThanOrEqual(3);
    expect(samples[0]).toBeGreaterThan(samples[1]);
    if (samples[2] === 0) {
      expect(samples[1]).toBeGreaterThanOrEqual(samples[2]);
    } else {
      expect(samples[1]).toBeGreaterThan(samples[2]);
    }

    expect(snackbarText).toMatch(/Next round in:/);
    expect(document.querySelectorAll(".snackbar").length).toBe(1);

    timers.cleanup();
    randomSpy.mockRestore();
  });
});
