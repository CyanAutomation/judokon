import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setupClassicBattleDom } from "./utils.js";
import { applyMockSetup } from "./mockSetup.js";

describe("classicBattle draw next round", () => {
  let timerSpy;
  let warnSpy;
  let fetchJsonMock;
  let generateRandomCardMock;
  let getRandomJudokaMock;
  let renderMock;
  let currentFlags;

  beforeEach(() => {
    ({
      timerSpy,
      fetchJsonMock,
      generateRandomCardMock,
      getRandomJudokaMock,
      renderMock,
      currentFlags
    } = setupClassicBattleDom());
    applyMockSetup({
      fetchJsonMock,
      generateRandomCardMock,
      getRandomJudokaMock,
      renderMock,
      currentFlags
    });
    const nextBtn = document.createElement("button");
    nextBtn.id = "next-button";
    document.body.appendChild(nextBtn);
    window.__NEXT_ROUND_COOLDOWN_MS = 0;
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    timerSpy.clearAllTimers();
    warnSpy.mockRestore();
    vi.restoreAllMocks();
    delete window.__NEXT_ROUND_COOLDOWN_MS;
    document.body.innerHTML = "";
  });

  async function playRound(battleMod, store, playerValue, opponentValue) {
    document.getElementById("player-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>${playerValue}</span></li></ul>`;
    document.getElementById("opponent-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>${opponentValue}</span></li></ul>`;
    store.selectionMade = false;
    const p = battleMod.handleStatSelection(store, "power");
    await vi.runAllTimersAsync();
    return p;
  }

  it("enables Next after draw and continues match", async () => {
    const battleMod = await import("../../../src/helpers/classicBattle.js");
    const store = battleMod.createBattleStore();
    battleMod._resetForTest(store);

    const result = await playRound(battleMod, store, 5, 5);
    battleMod.startCooldown(store);
    await vi.runAllTimersAsync();
    const nextBtn = document.getElementById("next-button");
    expect(nextBtn.disabled).toBe(false);
    expect(nextBtn.dataset.nextReady).toBe("true");

    const { onNextButtonClick } = await import(
      "../../../src/helpers/classicBattle/timerService.js"
    );
    onNextButtonClick(new MouseEvent("click"));
    const result2 = await playRound(battleMod, store, 6, 4);
    expect(result2.playerScore).toBe(1);
  });
});
