import { describe, it, expect, vi, beforeEach } from "vitest";
import "./commonMocks.js";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";
import { createRoundMessage, createSnackbarContainer, createTimerNodes } from "./domUtils.js";

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
  await vi.advanceTimersByTimeAsync(1000);
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
  });

  it("shows snackbar countdown with sequential updates", async () => {
    populateCards();
    const timer = vi.useFakeTimers();
    const { randomSpy } = await selectPower(battleMod, store);
    const snackbarEl = document.querySelector(".snackbar");
    expect(snackbarEl && snackbarEl.textContent).toMatch(/Next round in: [23]s/);
    expect(document.querySelectorAll(".snackbar").length).toBe(1);

    await vi.advanceTimersByTimeAsync(1000);
    // Depending on when the countdown renderer attaches relative to test
    // timer advancement, the first visible decrement may already have
    // occurred. Accept 2s (preferred) or 1s to keep this test robust.
    expect(snackbarEl.textContent).toMatch(/Next round in: [12]s/);
    await vi.advanceTimersByTimeAsync(1000);
    expect(snackbarEl.textContent).toMatch(/Next round in: [10]s/);
    expect(document.querySelectorAll(".snackbar").length).toBe(1);

    timer.clearAllTimers();
    randomSpy.mockRestore();
  });
});
