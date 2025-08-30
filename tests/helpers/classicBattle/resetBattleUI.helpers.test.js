import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../src/helpers/classicBattle/timerService.js", () => ({
  onNextButtonClick: vi.fn(),
  getNextRoundControls: vi.fn()
}));

vi.mock("../../../src/helpers/setupScoreboard.js", () => ({
  clearMessage: vi.fn(),
  clearTimer: vi.fn()
}));

vi.mock("../../../src/helpers/classicBattle/uiService.js", () => ({
  syncScoreDisplay: vi.fn()
}));

import * as helpers from "../../../src/helpers/classicBattle/uiHelpers.js";

const { removeBackdrops, resetActionButtons, clearRoundInfo } = helpers;

describe("resetBattleUI helpers", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  describe("removeBackdrops", () => {
    it("removes backdrops and destroys quit modal", () => {
      document.body.innerHTML =
        '<div class="modal-backdrop"></div><div class="modal-backdrop"></div>';
      const destroy = vi.fn();
      const store = { quitModal: { destroy } };
      removeBackdrops(store);
      expect(document.querySelectorAll(".modal-backdrop")).toHaveLength(0);
      expect(destroy).toHaveBeenCalledTimes(1);
      expect(store.quitModal).toBeNull();
    });
  });

  describe("resetActionButtons", () => {
    it("replaces buttons and wires next click", async () => {
      const next = document.createElement("button");
      next.id = "next-button";
      next.dataset.nextReady = "true";
      const quit = document.createElement("button");
      quit.id = "quit-match-button";
      const quitListener = vi.fn();
      quit.addEventListener("click", quitListener);
      document.body.append(next, quit);

      resetActionButtons();

      const timerSvc = await import("../../../src/helpers/classicBattle/timerService.js");

      const newNext = document.getElementById("next-button");
      expect(newNext).not.toBe(next);
      expect(newNext.disabled).toBe(true);
      expect(newNext.dataset.nextReady).toBeUndefined();
      newNext.dispatchEvent(new MouseEvent("click"));
      expect(timerSvc.onNextButtonClick).toHaveBeenCalledTimes(1);

      const newQuit = document.getElementById("quit-match-button");
      expect(newQuit).not.toBe(quit);
      newQuit.dispatchEvent(new MouseEvent("click"));
      expect(quitListener).toHaveBeenCalledTimes(0);
    });
  });

  describe("clearRoundInfo", () => {
    it("clears round info and syncs scoreboard", async () => {
      document.body.innerHTML = `
        <div id="next-round-timer">5</div>
        <div id="round-result">win</div>
      `;

      const scoreboard = await import("../../../src/helpers/setupScoreboard.js");
      const uiService = await import("../../../src/helpers/classicBattle/uiService.js");

      clearRoundInfo();

      expect(scoreboard.clearMessage).toHaveBeenCalledTimes(1);
      expect(scoreboard.clearTimer).toHaveBeenCalledTimes(1);
      expect(document.getElementById("round-result").textContent).toBe("");
      expect(uiService.syncScoreDisplay).toHaveBeenCalledTimes(1);
    });
  });
});
