import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";
import { mount, clearBody } from "./domUtils.js";

vi.mock("../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));

import {
  __resetBattleEventTarget,
  emitBattleEvent
} from "../../src/helpers/classicBattle/battleEvents.js";

describe("scoreboardAdapter maps display.* events to Scoreboard", () => {
  let timers;
  /** @type {undefined | (() => void)} */
  let disposeScoreboard;
  let roundStore;
  beforeEach(async () => {
    timers = useCanonicalTimers();
    vi.resetModules();
    __resetBattleEventTarget();
    disposeScoreboard = undefined;
    const { container } = mount();
    const header = document.createElement("header");
    header.innerHTML = `
      <p id=\"round-message\" aria-live=\"polite\" aria-atomic=\"true\" role=\"status\"></p>
      <p id=\"next-round-timer\" aria-live=\"polite\" aria-atomic=\"true\" role=\"status\"></p>
      <p id=\"round-counter\" aria-live=\"polite\" aria-atomic=\"true\"></p>
      <p id=\"score-display\" aria-live=\"polite\" aria-atomic=\"true\"></p>
    `;
    container.appendChild(header);
    const { initScoreboard, resetScoreboard } = await import("../../src/components/Scoreboard.js");
    resetScoreboard();
    initScoreboard(header);
    const roundStoreModule = await import("../../src/helpers/classicBattle/roundStore.js");
    roundStore = roundStoreModule.roundStore;
    const { initScoreboardAdapter } = await import(
      "../../src/helpers/classicBattle/scoreboardAdapter.js"
    );
    disposeScoreboard = initScoreboardAdapter();
  });

  afterEach(() => {
    if (typeof disposeScoreboard === "function") {
      disposeScoreboard();
    }
    if (roundStore && typeof roundStore.reset === "function") {
      roundStore.reset();
    }
    clearBody();
    timers.cleanup();
  });

  it("updates message, outcome lock, timer, round counter, and score", async () => {
    emitBattleEvent("display.round.start", { roundNumber: 3 });
    await vi.advanceTimersByTimeAsync(220);
    expect(document.getElementById("round-counter").textContent).toBe("Round 3");

    emitBattleEvent("display.round.message", { text: "Fight!" });
    await vi.advanceTimersByTimeAsync(220);
    expect(document.getElementById("round-message").textContent).toBe("Fight!");

    emitBattleEvent("display.round.outcome", { text: "You win" });
    await vi.advanceTimersByTimeAsync(220);
    const msg = document.getElementById("round-message");
    expect(msg.textContent).toBe("You win");
    expect(msg.dataset.outcome).toBe("true");

    emitBattleEvent("display.timer.show", { secondsRemaining: 5 });
    await vi.advanceTimersByTimeAsync(220);
    expect(document.getElementById("next-round-timer").textContent).toBe("Time Left: 5s");
    emitBattleEvent("display.timer.tick", { secondsRemaining: 4 });
    await vi.advanceTimersByTimeAsync(220);
    expect(document.getElementById("next-round-timer").textContent).toBe("Time Left: 4s");
    emitBattleEvent("display.timer.hide");
    await vi.advanceTimersByTimeAsync(220);
    expect(document.getElementById("next-round-timer").textContent).toBe("");

    emitBattleEvent("display.score.update", { player: 2, opponent: 1 });
    const scoreText = document
      .getElementById("score-display")
      .textContent.replace(/\s+/g, " ")
      .trim();
    expect(scoreText).toContain("You: 2");
    expect(scoreText).toContain("Opponent: 1");
  });

  it("accepts string round numbers when starting a round", async () => {
    emitBattleEvent("display.round.start", { roundNumber: "3" });
    await vi.advanceTimersByTimeAsync(220);
    expect(document.getElementById("round-counter").textContent).toBe("Round 3");
  });

  it("handles string roundIndex values, zero, and clears invalid strings", async () => {
    const roundCounter = () => document.getElementById("round-counter").textContent;

    emitBattleEvent("display.round.start", { roundIndex: "5" });
    await vi.advanceTimersByTimeAsync(220);
    expect(roundCounter()).toBe("Round 5");

    emitBattleEvent("display.round.start", { roundIndex: 0 });
    await vi.advanceTimersByTimeAsync(220);
    expect(roundCounter()).toBe("Round 0");

    emitBattleEvent("display.round.start", { roundIndex: "not-a-number" });
    await vi.advanceTimersByTimeAsync(220);
    expect(roundCounter()).toBe("");

    emitBattleEvent("display.round.start", { roundIndex: "" });
    await vi.advanceTimersByTimeAsync(220);
    expect(roundCounter()).toBe("");
  });
});
