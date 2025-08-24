import { describe, it, expect, vi, beforeEach } from "vitest";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";
import { createRoundMessage, createSnackbarContainer, createTimerNodes } from "./domUtils.js";
vi.mock("../../../src/utils/scheduler.js", () => ({
  onFrame: (cb) => {
    const id = setTimeout(() => cb(performance.now()), 16);
    return id;
  },
  onSecondTick: (cb) => {
    const id = setInterval(() => cb(performance.now()), 1000);
    return id;
  },
  cancel: (id) => {
    clearTimeout(id);
    clearInterval(id);
  },
  start: vi.fn(),
  stop: vi.fn()
}));

vi.mock("../../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));

vi.mock("../../../src/helpers/classicBattle/uiHelpers.js", async () => {
  const actual = await vi.importActual("../../../src/helpers/classicBattle/uiHelpers.js");
  return {
    ...actual,
    renderOpponentCard: vi.fn(),
    disableNextRoundButton: vi.fn(),
    enableNextRoundButton: vi.fn(),
    updateDebugPanel: vi.fn()
  };
});

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
  await battleMod.selectStat(store, "power", { delayMs: 0, sleep: async () => {} });
  return { randomSpy };
}

describe("countdown resets after stat selection", () => {
  let battleMod;
  let store;
  beforeEach(async () => {
    document.body.innerHTML = "";
    const { playerCard, opponentCard } = createBattleCardContainers();
    const header = createBattleHeader();
    header.querySelector("#next-round-timer")?.remove();
    document.body.append(playerCard, opponentCard, header);
    createRoundMessage("round-result");
    createTimerNodes();
    document.body.innerHTML += '<div id="stat-buttons"><button data-stat="power"></button></div>';
    createSnackbarContainer();
    battleMod = await import("../../../src/helpers/classicBattle.js");
    store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
  });

  it("clears the next round timer after stat selection", async () => {
    populateCards();
    const timer = vi.useFakeTimers();
    const { randomSpy } = await selectPower(battleMod, store);
    expect(document.getElementById("next-round-timer").textContent).toBe("");
    await vi.advanceTimersByTimeAsync(3000);
    expect(document.getElementById("next-round-timer").textContent).toBe("");
    timer.clearAllTimers();
    randomSpy.mockRestore();
  });

  it("shows snackbar countdown with sequential updates", async () => {
    populateCards();
    const timer = vi.useFakeTimers();
    const { randomSpy } = await selectPower(battleMod, store);

    const snackbarEl = document.querySelector(".snackbar");
    expect(snackbarEl && snackbarEl.textContent).toMatch(/Next round in: [23]s/);
    expect(document.querySelectorAll(".snackbar").length).toBe(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(snackbarEl.textContent).toBe("Next round in: 2s");
    await vi.advanceTimersByTimeAsync(1000);
    expect(snackbarEl.textContent).toBe("Next round in: 1s");
    expect(document.querySelectorAll(".snackbar").length).toBe(1);

    timer.clearAllTimers();
    randomSpy.mockRestore();
  });
});
