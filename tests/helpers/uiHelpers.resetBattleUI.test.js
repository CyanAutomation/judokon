import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../src/helpers/classicBattle/timerService.js", () => ({
  onNextButtonClick: vi.fn()
}));

vi.mock("../../src/helpers/setupScoreboard.js", () => ({
  clearMessage: vi.fn(),
  clearTimer: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/uiService.js", () => ({
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
    document.body.innerHTML =
      '<div class="modal-backdrop"></div><div class="modal-backdrop"></div>';
    const destroy = vi.fn();
    const store = { quitModal: { destroy } };
    helpers.removeBackdrops(store);
    expect(document.querySelectorAll(".modal-backdrop")).toHaveLength(0);
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

    const timerSvc = await import("../../src/helpers/classicBattle/timerService.js");

    const newBtn = document.querySelector('[data-role="next-round"]');
    expect(newBtn).not.toBe(btn);
    expect(newBtn.disabled).toBe(true);
    expect(newBtn.dataset.nextReady).toBeUndefined();
    newBtn.dispatchEvent(new MouseEvent("click"));
    expect(timerSvc.onNextButtonClick).toHaveBeenCalledTimes(1);
  });

  it("resetQuitButton replaces quit button", () => {
    const btn = document.createElement("button");
    btn.id = "quit-match-button";
    btn.setAttribute("data-testid", "quit-match");
    const listener = vi.fn();
    btn.addEventListener("click", listener);
    document.body.append(btn);

    helpers.resetQuitButton();

    const newBtn = document.querySelector('[data-testid="quit-match"]');
    expect(newBtn).not.toBe(btn);
    newBtn.dispatchEvent(new MouseEvent("click"));
    expect(listener).not.toHaveBeenCalled();
  });

  it("clearScoreboardAndMessages resets scoreboard and round result", async () => {
    document.body.innerHTML = '<div id="round-result">win</div>';

    helpers.clearScoreboardAndMessages();

    const scoreboard = await import("../../src/helpers/setupScoreboard.js");
    const uiService = await import("../../src/helpers/classicBattle/uiService.js");

    expect(scoreboard.clearMessage).toHaveBeenCalledTimes(1);
    expect(scoreboard.clearTimer).toHaveBeenCalledTimes(1);
    expect(document.getElementById("round-result").textContent).toBe("");
    expect(uiService.syncScoreDisplay).toHaveBeenCalledTimes(1);
  });
  afterEach(() => {
    clearBody();
  });
});
