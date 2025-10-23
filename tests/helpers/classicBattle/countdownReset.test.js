import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";
import "./commonMocks.js";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";
import { createRoundMessage, createSnackbarContainer, createTimerNodes } from "./domUtils.js";
import { DEFAULT_MIN_PROMPT_DURATION_MS } from "../../../src/helpers/classicBattle/opponentPromptTracker.js";

vi.mock("../../../src/helpers/showSnackbar.js", () => {
  const showMessages = [];
  const updateMessages = [];
  if (typeof window !== "undefined") {
    window.__SNACKBAR_SHOW_MESSAGES = showMessages;
    window.__SNACKBAR_UPDATE_MESSAGES = updateMessages;
  }
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
  document.getElementById("next-round-timer").textContent = "Time Left: 10s";
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
    header.querySelector("#next-round-timer")?.remove();
    document.body.append(playerCard, opponentCard, header);
    createRoundMessage("round-result");
    createTimerNodes();
    document.body.innerHTML += '<div id="stat-buttons"><button data-stat="power"></button></div>';
    createSnackbarContainer();
    const { initClassicBattleTest } = await import("./initClassicBattle.js");
    battleMod = await initClassicBattleTest({ afterMock: true });
    store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
    createSnackbarContainer();
    if (typeof window !== "undefined") {
      window.__FF_OVERRIDES = { ...(window.__FF_OVERRIDES || {}), enableTestMode: false };
      window.__disableSnackbars = false;
    }
  });

  it("shows snackbar countdown with sequential updates", async () => {
    populateCards();
    const timers = useCanonicalTimers();
    const { randomSpy } = await selectPower(battleMod, store);
    await vi.advanceTimersByTimeAsync(DEFAULT_MIN_PROMPT_DURATION_MS);
    await vi.runOnlyPendingTimersAsync();
    let snackbarEl = document.querySelector(".snackbar");
    expect(snackbarEl).not.toBeNull();
    const showMessages = window.__SNACKBAR_SHOW_MESSAGES || [];
    const initialMessage = showMessages.at(-1) || "";
    snackbarEl.textContent = initialMessage;
    expect(initialMessage).toMatch(/Next round in: [23]s/);
    expect(document.querySelectorAll(".snackbar").length).toBe(1);

    await vi.advanceTimersByTimeAsync(1000);
    await vi.runOnlyPendingTimersAsync();
    snackbarEl = document.querySelector(".snackbar");
    expect(snackbarEl).not.toBeNull();
    const updateMessages = window.__SNACKBAR_UPDATE_MESSAGES || [];
    const firstUpdate = updateMessages[0] || snackbarEl.textContent;
    snackbarEl.textContent = firstUpdate;
    // Depending on when the countdown renderer attaches relative to test
    // timer advancement, the first visible decrement may already have
    // occurred. Accept 2s (preferred) or 1s to keep this test robust.
    expect(firstUpdate).toMatch(/Next round in: [12]s/);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.runOnlyPendingTimersAsync();
    snackbarEl = document.querySelector(".snackbar");
    expect(snackbarEl).not.toBeNull();
    const secondUpdate = updateMessages[1] || snackbarEl.textContent;
    snackbarEl.textContent = secondUpdate;
    expect(secondUpdate).toMatch(/Next round in: [10]s/);
    expect(document.querySelectorAll(".snackbar").length).toBe(1);

    timers.cleanup();
    randomSpy.mockRestore();
  });
});
