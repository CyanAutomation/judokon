import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import {
  __resetBattleEventTarget,
  emitBattleEvent
} from "../../src/helpers/classicBattle/battleEvents.js";
import { mount, clearBody } from "./domUtils.js";

function createTrackedScheduler() {
  let now = 0;
  const tasks = [];
  const setTimeout = vi.fn((cb, ms) => {
    const id = Symbol("timer");
    tasks.push({ id, time: now + ms, cb });
    tasks.sort((a, b) => a.time - b.time);
    return id;
  });
  const clearTimeout = vi.fn((id) => {
    const idx = tasks.findIndex((task) => task.id === id);
    if (idx !== -1) tasks.splice(idx, 1);
  });

  function tick(ms) {
    now += ms;
    tasks.sort((a, b) => a.time - b.time);
    while (tasks.length && tasks[0].time <= now) {
      const task = tasks.shift();
      task.cb();
    }
  }

  return { setTimeout, clearTimeout, tick };
}

describe("battleScoreboard waiting fallback", () => {
  let scheduler;

  beforeEach(async () => {
    __resetBattleEventTarget();
    const { container } = mount();
    const header = document.createElement("header");
    header.className = "battle-header";
    header.innerHTML = `
      <p id="round-message" aria-live="polite" aria-atomic="true" role="status"></p>
      <p id="next-round-timer" aria-live="polite" aria-atomic="true" role="status">
        <span data-part="label">Time Left:</span>
        <span data-part="value">0s</span>
      </p>
      <p id="round-counter" aria-live="polite" aria-atomic="true"></p>
      <p id="score-display" aria-live="polite" aria-atomic="true">
        <span data-side="player">
          <span data-part="label">You:</span>
          <span data-part="value">0</span>
        </span>
        <span data-side="opponent">
          <span data-part="label">Opponent:</span>
          <span data-part="value">0</span>
        </span>
      </p>
    `;
    container.appendChild(header);

    const { initScoreboard, resetScoreboard } = await import("../../src/components/Scoreboard.js");
    resetScoreboard();
    initScoreboard(header);

    scheduler = createTrackedScheduler();
    const { initBattleScoreboardAdapter } = await import("../../src/helpers/battleScoreboard.js");
    initBattleScoreboardAdapter({ scheduler });
  });

  afterEach(async () => {
    const { disposeBattleScoreboardAdapter } = await import(
      "../../src/helpers/battleScoreboard.js"
    );
    disposeBattleScoreboardAdapter();
    clearBody();
  });

  it("shows 'Waiting…' after 500ms and clears on first state event", async () => {
    const msg = document.getElementById("round-message");
    expect(msg.textContent).toBe("");
    scheduler.tick(499);
    expect(msg.textContent).toBe("");
    scheduler.tick(1);
    expect(msg.textContent).toMatch(/Waiting/);

    emitBattleEvent("control.state.changed", { to: "selection" });
    expect(msg.textContent).toBe("");
  });

  it("cancels waiting fallback when a state event arrives before timeout", async () => {
    const msg = document.getElementById("round-message");

    emitBattleEvent("control.state.changed", { to: "selection" });
    expect(scheduler.clearTimeout).toHaveBeenCalledTimes(1);

    scheduler.tick(500);
    expect(msg.textContent).toBe("");
  });
});
