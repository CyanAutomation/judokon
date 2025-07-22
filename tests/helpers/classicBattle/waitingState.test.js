import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";

let fetchJsonMock;
let generateRandomCardMock;
let getRandomJudokaMock;
let renderJudokaCardMock;

vi.mock("../../../src/helpers/randomCard.js", () => ({
  generateRandomCard: (...args) => generateRandomCardMock(...args)
}));

vi.mock("../../../src/helpers/cardUtils.js", () => ({
  getRandomJudoka: (...args) => getRandomJudokaMock(...args),
  renderJudokaCard: (...args) => renderJudokaCardMock(...args)
}));

vi.mock("../../../src/helpers/dataUtils.js", () => ({
  fetchJson: (...args) => fetchJsonMock(...args)
}));

vi.mock("../../../src/helpers/utils.js", () => ({
  createGokyoLookup: () => ({})
}));

describe("scheduleNextRound waiting state", () => {
  let timerSpy;
  beforeEach(() => {
    document.body.innerHTML = "";
    const { playerCard, computerCard } = createBattleCardContainers();
    const header = createBattleHeader();
    document.body.append(playerCard, computerCard, header);
    timerSpy = vi.useFakeTimers();
    fetchJsonMock = vi.fn(async () => []);
    generateRandomCardMock = vi.fn(async (_d, _g, container, _pm, cb) => {
      container.innerHTML = `<ul><li class=\"stat\"><strong>Power</strong> <span>5</span></li></ul>`;
      if (cb) cb({ id: 1 });
    });
    getRandomJudokaMock = vi.fn(() => ({ id: 2 }));
    renderJudokaCardMock = vi.fn(async (_j, _g, container) => {
      container.innerHTML = `<ul><li class=\"stat\"><strong>Power</strong> <span>3</span></li></ul>`;
    });
  });

  afterEach(() => {
    timerSpy.clearAllTimers();
  });

  it("shows Waiting... and retries when startRound fails", async () => {
    const battleMod = await import("../../../src/helpers/classicBattle.js");
    const infoMod = await import("../../../src/helpers/setupBattleInfoBar.js");
    const startSpy = vi.fn().mockRejectedValueOnce(new Error("fail")).mockResolvedValueOnce();
    vi.spyOn(infoMod, "startCountdown").mockImplementation((_s, cb) => cb());
    window.startRoundOverride = startSpy;

    battleMod.scheduleNextRound({ matchEnded: false });

    timerSpy.advanceTimersByTime(5000); // 2s delay + 3s countdown
    await vi.runOnlyPendingTimersAsync();

    expect(document.querySelector("#round-message").textContent).toBe("Waiting...");
    expect(startSpy).toHaveBeenCalledTimes(2);
    delete window.startRoundOverride;
  });
});
