import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import {
  __resetBattleEventTarget,
  emitBattleEvent
} from "../../src/helpers/classicBattle/battleEvents.js";
import { mount, clearBody } from "./domUtils.js";

function createAnimationScheduler() {
  const rafCallbacks = new Map();
  let rafHandle = 0;

  return {
    setTimeout: vi.fn(() => Symbol("timeout")),
    clearTimeout: vi.fn(),
    requestAnimationFrame: vi.fn((callback) => {
      rafHandle += 1;
      rafCallbacks.set(rafHandle, callback);
      return rafHandle;
    }),
    cancelAnimationFrame: vi.fn((handle) => {
      rafCallbacks.delete(handle);
    }),
    flushAnimationFrames() {
      const handles = [...rafCallbacks.keys()].sort((a, b) => a - b);
      for (const handle of handles) {
        const callback = rafCallbacks.get(handle);
        rafCallbacks.delete(handle);
        if (typeof callback === "function") {
          callback();
        }
      }
    }
  };
}

describe("battleScoreboard outcome animation interruption", () => {
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

    scheduler = createAnimationScheduler();
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

  it("supersedes an in-progress control-state animation with the latest state", () => {
    emitBattleEvent("round.evaluated", {
      outcome: "winPlayer",
      scores: { player: 1, opponent: 0 },
      message: "Round won"
    });

    emitBattleEvent("control.state.changed", { to: "roundDisplay" });
    emitBattleEvent("control.state.changed", { to: "selection" });

    expect(scheduler.cancelAnimationFrame).toHaveBeenCalledTimes(1);

    scheduler.flushAnimationFrames();

    const header = document.querySelector(".battle-header");
    const message = document.getElementById("round-message");
    expect(header.dataset.outcome).toBe("none");
    expect(message.textContent).toBe("");
  });

  it("prevents stale roundDisplay animation from overriding a newer concluded state", () => {
    emitBattleEvent("round.evaluated", {
      outcome: "winPlayer",
      scores: { player: 2, opponent: 1 },
      message: "Interim"
    });
    emitBattleEvent("match.concluded", {
      winner: "opponent",
      reason: "matchWinOpponent",
      message: "Opponent wins"
    });

    emitBattleEvent("control.state.changed", { to: "roundDisplay" });
    emitBattleEvent("control.state.changed", { to: "concluded" });

    scheduler.flushAnimationFrames();

    const header = document.querySelector(".battle-header");
    const message = document.getElementById("round-message");
    expect(header.dataset.outcome).toBe("opponentWin");
    expect(message.textContent).toBe("Opponent wins");
  });

  it("keeps cancellation idempotent when no active animation exists", async () => {
    const { disposeBattleScoreboardAdapter } = await import(
      "../../src/helpers/battleScoreboard.js"
    );
    expect(() => disposeBattleScoreboardAdapter()).not.toThrow();
    expect(() => disposeBattleScoreboardAdapter()).not.toThrow();
  });
});
