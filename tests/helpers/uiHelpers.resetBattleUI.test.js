import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../src/helpers/classicBattle/timerService.js", () => ({
  onNextButtonClick: vi.fn()
}));

vi.mock("../../src/helpers/setupScoreboard.js", () => ({
  clearMessage: vi.fn(),
  clearTimer: vi.fn(),
  updateRoundCounter: vi.fn(),
  clearRoundCounter: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/scoreDisplay.js", () => ({
  syncScoreDisplay: vi.fn()
}));

import * as helpers from "../../src/helpers/classicBattle/uiHelpers.js";
import { mount, clearBody } from "./domUtils.js";

describe("resetBattleUI helpers", () => {
  beforeEach(() => {
    mount();
    vi.clearAllMocks();
  });

  it("removeBackdrops removes backdrops and destroys quit modal", () => {
    document.body.innerHTML = '<dialog class="modal"></dialog><dialog class="modal"></dialog>';
    const destroy = vi.fn();
    const store = { quitModal: { destroy } };
    helpers.removeBackdrops(store);
    expect(document.querySelectorAll("dialog.modal")).toHaveLength(0);
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(store.quitModal).toBeNull();
  });

  it("resetNextButton clones and disables next button", async () => {
    const btn = document.createElement("button");
    btn.id = "next-button";
    btn.setAttribute("data-role", "next-round");
    btn.dataset.nextReady = "true";
    document.body.append(btn);

    helpers.resetNextButton();

    const newBtn = document.querySelector('[data-role="next-round"]');
    expect(newBtn).not.toBe(btn);
    expect(newBtn.disabled).toBe(true);
    expect(newBtn.dataset.nextReady).toBeUndefined();
    expect(newBtn.dataset.action).toBe("next");
  });

  it("resetQuitButton replaces quit button", () => {
    const btn = document.createElement("button");
    btn.id = "quit-button";
    const listener = vi.fn();
    btn.addEventListener("click", listener);
    document.body.append(btn);

    helpers.resetQuitButton();

    const newBtn = document.getElementById("quit-button");
    expect(newBtn).not.toBe(btn);
    newBtn.dispatchEvent(new MouseEvent("click"));
    expect(listener).not.toHaveBeenCalled();
  });

  it("clearScoreboardAndMessages resets scoreboard and round result", async () => {
    document.body.innerHTML = '<div id="round-result">win</div>';

    helpers.clearScoreboardAndMessages();

    const scoreboard = await import("../../src/helpers/setupScoreboard.js");
    const scoreDisplay = await import("../../src/helpers/classicBattle/scoreDisplay.js");

    expect(scoreboard.clearMessage).toHaveBeenCalledTimes(1);
    expect(scoreboard.clearTimer).toHaveBeenCalledTimes(1);
    expect(document.getElementById("round-result").textContent).toBe("");
    expect(scoreDisplay.syncScoreDisplay).toHaveBeenCalledTimes(1);
  });
  afterEach(() => {
    clearBody();
  });
});
