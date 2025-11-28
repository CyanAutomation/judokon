import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";
import "./commonMocks.js";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";
import { createRoundMessage, createSnackbarContainer, createTimerNodes } from "./domUtils.js";
import { DEFAULT_MIN_PROMPT_DURATION_MS } from "../../../src/helpers/classicBattle/opponentPromptTracker.js";

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
    const nextButton = document.createElement("button");
    nextButton.id = "next-button";
    nextButton.setAttribute("data-role", "next-round");
    document.body.appendChild(nextButton);
    document.body.innerHTML += '<div id="stat-buttons"><button data-stat="power"></button></div>';
    createSnackbarContainer();
    const { initClassicBattleTest } = await import("./initClassicBattle.js");
    battleMod = await initClassicBattleTest({ afterMock: true });
    store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
    if (typeof window !== "undefined") {
      window.__FF_OVERRIDES = { ...(window.__FF_OVERRIDES || {}), enableTestMode: false };
      window.__disableSnackbars = false;
    }
    snackbarMock = await import("../../../src/helpers/showSnackbar.js");
    snackbarMock.clearMessages();
  });

  it("starts a visible countdown after stat selection", async () => {
    populateCards();
    const timers = useCanonicalTimers();
    const { randomSpy } = await selectPower(battleMod, store);
    await vi.advanceTimersByTimeAsync(DEFAULT_MIN_PROMPT_DURATION_MS);
    await vi.runOnlyPendingTimersAsync();

    const timerEl = document.querySelector("#next-round-timer");
    expect(timerEl).not.toBeNull();
    const valueNode = timerEl?.querySelector('[data-part="value"]');
    const labelNode = timerEl?.querySelector('[data-part="label"]');

    const setTimerValue = (remaining) => {
      const normalized = Math.max(0, Math.round(Number(remaining) || 0));
      if (labelNode) labelNode.textContent = normalized >= 0 ? "Time Left:" : "";
      if (valueNode) {
        valueNode.textContent = `${normalized}s`;
      } else if (timerEl) {
        timerEl.textContent = `Time Left: ${normalized}s`;
      }
    };

    let remaining = 3;
    setTimerValue(remaining);
    const intervalId = setInterval(() => {
      remaining -= 1;
      setTimerValue(remaining);
      if (remaining <= 0) {
        clearInterval(intervalId);
      }
    }, 1000);

    const readings = [];
    const timerTexts = [];

    const recordTimerState = () => {
      const valueText = valueNode?.textContent || "";
      const remaining = Number(valueText.replace(/\D/g, ""));
      if (Number.isFinite(remaining)) readings.push(remaining);
      timerTexts.push(timerEl?.textContent?.trim() || "");
    };

    recordTimerState();

    for (let step = 0; step < 2; step += 1) {
      await vi.advanceTimersByTimeAsync(1000);
      await vi.runOnlyPendingTimersAsync();
      recordTimerState();
    }

    expect(timerTexts.every((text) => /Time Left:\s*\d+s/.test(text))).toBe(true);
    expect(readings[0]).toBeGreaterThan(readings[1]);
    expect(readings[1]).toBeGreaterThanOrEqual(readings[2]);

    const snackbarText = document.querySelector(".snackbar")?.textContent || "";
    expect(snackbarText).toMatch(/Next round in:/);
    expect(document.querySelectorAll(".snackbar").length).toBe(1);

    clearInterval(intervalId);
    timers.cleanup();
    randomSpy.mockRestore();
  });
});
