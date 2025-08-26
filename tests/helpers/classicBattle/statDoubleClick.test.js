import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setupClassicBattleDom } from "./utils.js";
import { applyMockSetup } from "./mockSetup.js";

describe("classicBattle stat double-click", () => {
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

  async function playDoubleClickRound(battleMod, store, playerValue, opponentValue) {
    document.getElementById("player-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>${playerValue}</span></li></ul>`;
    document.getElementById("opponent-card").innerHTML =
      `<ul><li class="stat"><strong>Power</strong> <span>${opponentValue}</span></li></ul>`;
    store.selectionMade = false;
    const p = battleMod.handleStatSelection(store, "power");
    battleMod.handleStatSelection(store, "power");
    await vi.runAllTimersAsync();
    return p;
  }

  it("ignores rapid double-clicks without ending match", async () => {
    const battleMod = await import("../../../src/helpers/classicBattle.js");
    const store = battleMod.createBattleStore();
    battleMod._resetForTest(store);

    const result1 = await playDoubleClickRound(battleMod, store, 5, 3);
    expect(result1.playerScore).toBe(1);
    expect(result1.matchEnded).toBe(false);

    battleMod.scheduleNextRound(result1);
    await vi.runAllTimersAsync();
    const { onNextButtonClick } = await import(
      "../../../src/helpers/classicBattle/timerService.js"
    );
    onNextButtonClick(new MouseEvent("click"));

    const result2 = await playDoubleClickRound(battleMod, store, 5, 3);
    expect(result2.playerScore).toBe(2);
    expect(result2.matchEnded).toBe(false);
  });
});
