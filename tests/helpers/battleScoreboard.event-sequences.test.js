import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import {
  __resetBattleEventTarget,
  emitBattleEvent
} from "../../src/helpers/classicBattle/battleEvents.js";
import { mount, clearBody } from "./domUtils.js";
import { useCanonicalTimers } from "../setup/fakeTimers.js";

function mountScoreboardDom() {
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
  return header;
}

function snapshot() {
  const header = document.querySelector(".battle-header");
  const scoreText = document
    .getElementById("score-display")
    .textContent.replace(/\s+/g, " ")
    .trim();
  return {
    outcome: header?.dataset?.outcome ?? "none",
    roundMessage: document.getElementById("round-message").textContent,
    roundCounter: document.getElementById("round-counter").textContent,
    scoreText
  };
}

function dispatchSequence(sequence) {
  for (const step of sequence) {
    emitBattleEvent(step.type, step.detail);
  }
  return snapshot();
}

function createAnimationScheduler() {
  let handle = 0;
  const frameCallbacks = new Map();

  return {
    setTimeout: (cb, ms) => setTimeout(cb, ms),
    clearTimeout: (id) => clearTimeout(id),
    requestAnimationFrame: vi.fn((cb) => {
      handle += 1;
      frameCallbacks.set(handle, cb);
      return handle;
    }),
    cancelAnimationFrame: vi.fn((id) => {
      frameCallbacks.delete(id);
    }),
    flushAnimationFrames() {
      const callbacks = [...frameCallbacks.values()];
      frameCallbacks.clear();
      callbacks.forEach((cb) => cb());
    }
  };
}

describe("battleScoreboard deterministic event sequences", () => {
  let timers;

  beforeEach(async () => {
    timers = useCanonicalTimers();
    __resetBattleEventTarget();
    const header = mountScoreboardDom();
    const { initScoreboard, resetScoreboard } = await import("../../src/components/Scoreboard.js");
    resetScoreboard();
    initScoreboard(header);
  });

  afterEach(async () => {
    const { disposeBattleScoreboardAdapter } = await import(
      "../../src/helpers/battleScoreboard.js"
    );
    disposeBattleScoreboardAdapter();
    timers.runAllTimers();
    timers.cleanup();
    vi.restoreAllMocks();
    clearBody();
  });

  it("uses control.state.changed as the only driver for UI mode transitions", async () => {
    const { initBattleScoreboardAdapter } = await import("../../src/helpers/battleScoreboard.js");
    initBattleScoreboardAdapter();

    emitBattleEvent("round.evaluated", {
      outcome: "winPlayer",
      message: "Round won",
      scores: { player: 1, opponent: 0 }
    });
    emitBattleEvent("round.started", { roundIndex: 2 });
    emitBattleEvent("round.timer.tick", { remainingMs: 3200 });

    expect(snapshot().outcome).toBe("playerWin");

    emitBattleEvent("control.state.changed", { to: "selection" });

    const state = snapshot();
    expect(state.outcome).toBe("none");
    expect(state.roundMessage).toBe("");
  });

  it("keeps value-only events from changing UI mode state", async () => {
    const { initBattleScoreboardAdapter } = await import("../../src/helpers/battleScoreboard.js");
    initBattleScoreboardAdapter();

    emitBattleEvent("round.evaluated", {
      outcome: "winPlayer",
      message: "Interim",
      scores: { player: 2, opponent: 1 }
    });

    emitBattleEvent("match.concluded", {
      winner: "opponent",
      message: "Compatibility-only payload",
      scores: { player: 2, opponent: 3 }
    });

    const state = snapshot();
    expect(state.outcome).toBe("playerWin");
    expect(state.roundMessage).toBe("Interim");
    expect(state.scoreText).toContain("You: 2");
    expect(state.scoreText).toContain("Opponent: 3");
  });

  it("converges to the same UI for out-of-order authoritative/value event sequences", async () => {
    const { initBattleScoreboardAdapter } = await import("../../src/helpers/battleScoreboard.js");
    initBattleScoreboardAdapter();

    const sequences = [
      [
        {
          type: "control.state.changed",
          detail: { to: "roundDisplay", roundIndex: 4, context: { roundIndex: 4 } }
        },
        {
          type: "round.evaluated",
          detail: {
            roundIndex: 4,
            outcome: "winPlayer",
            message: "Round 4 win",
            scores: { player: 3, opponent: 1 }
          }
        }
      ],
      [
        {
          type: "round.evaluated",
          detail: {
            roundIndex: 4,
            outcome: "winPlayer",
            message: "Round 4 win",
            scores: { player: 3, opponent: 1 }
          }
        },
        {
          type: "control.state.changed",
          detail: { to: "roundDisplay", roundIndex: 4, context: { roundIndex: 4 } }
        }
      ]
    ];

    const baseline = dispatchSequence(sequences[0]);
    expect(baseline.outcome).toBe("playerWin");

    const { disposeBattleScoreboardAdapter } = await import(
      "../../src/helpers/battleScoreboard.js"
    );
    disposeBattleScoreboardAdapter();
    __resetBattleEventTarget();
    clearBody();
    const header = mountScoreboardDom();
    const { initScoreboard, resetScoreboard } = await import("../../src/components/Scoreboard.js");
    resetScoreboard();
    initScoreboard(header);
    initBattleScoreboardAdapter();

    const reordered = dispatchSequence(sequences[1]);
    expect(reordered).toEqual(baseline);
  });

  it("handles duplicate event payloads idempotently across value and domain events", async () => {
    const { initBattleScoreboardAdapter } = await import("../../src/helpers/battleScoreboard.js");
    initBattleScoreboardAdapter();

    const eventTable = [
      {
        type: "round.evaluated",
        detail: {
          roundIndex: 9,
          outcome: "winPlayer",
          message: "Repeatable",
          scores: { player: 4, opponent: 2 }
        }
      },
      {
        type: "round.evaluated",
        detail: {
          roundIndex: 9,
          outcome: "winPlayer",
          message: "Repeatable",
          scores: { player: 4, opponent: 2 }
        }
      },
      { type: "control.state.changed", detail: { to: "selection", roundIndex: 9 } },
      { type: "control.state.changed", detail: { to: "selection", roundIndex: 9 } }
    ];

    dispatchSequence(eventTable);

    const state = snapshot();
    expect(state.outcome).toBe("none");
    expect(state.roundMessage).toBe("");
    expect(state.scoreText).toContain("You: 4");
    expect(state.scoreText).toContain("Opponent: 2");
  });

  it("interrupts stale animations and honors the latest authoritative state", async () => {
    const scheduler = createAnimationScheduler();
    const { initBattleScoreboardAdapter } = await import("../../src/helpers/battleScoreboard.js");
    initBattleScoreboardAdapter({ scheduler });

    const sequence = [
      {
        type: "round.evaluated",
        detail: {
          outcome: "winPlayer",
          message: "Interim",
          scores: { player: 2, opponent: 1 }
        }
      },
      { type: "control.state.changed", detail: { to: "roundDisplay", sequence: 10 } },
      { type: "control.state.changed", detail: { to: "concluded", sequence: 11 } },
      {
        type: "match.concluded",
        detail: {
          winner: "opponent",
          message: "Final authoritative state",
          scores: { player: 2, opponent: 3 }
        }
      }
    ];

    dispatchSequence(sequence);
    scheduler.flushAnimationFrames();

    const state = snapshot();
    expect(scheduler.cancelAnimationFrame).toHaveBeenCalledTimes(1);
    expect(state.outcome).toBe("opponentWin");
    expect(state.roundMessage).toBe("Final authoritative state");
  });

  it("uses injected scheduler + fake timers for deterministic waiting fallback", async () => {
    const scheduler = {
      setTimeout: (cb, ms) => setTimeout(cb, ms),
      clearTimeout: (id) => clearTimeout(id)
    };
    const { initBattleScoreboardAdapter } = await import("../../src/helpers/battleScoreboard.js");
    initBattleScoreboardAdapter({ scheduler });

    const messageNode = document.getElementById("round-message");
    expect(messageNode.textContent).toBe("");

    timers.advanceTimersByTime(499);
    expect(messageNode.textContent).toBe("");

    timers.advanceTimersByTime(1);
    expect(messageNode.textContent).toContain("Waiting");

    emitBattleEvent("control.state.changed", { to: "selection" });
    expect(messageNode.textContent).toBe("");
  });

  it("degrades safely when catalogVersion mismatches at runtime", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { initBattleScoreboardAdapter } = await import("../../src/helpers/battleScoreboard.js");
    initBattleScoreboardAdapter({ catalogVersion: "v2" });

    emitBattleEvent("round.evaluated", {
      catalogVersion: "v2",
      scores: { player: 1, opponent: 0 },
      outcome: "winPlayer",
      message: "Accepted before mismatch"
    });
    emitBattleEvent("round.evaluated", {
      catalogVersion: "v999",
      scores: { player: 9, opponent: 9 },
      outcome: "winOpponent",
      message: "Should never apply"
    });
    emitBattleEvent("round.evaluated", {
      catalogVersion: "v2",
      scores: { player: 5, opponent: 5 },
      outcome: "draw",
      message: "Ignored after disposal"
    });

    const state = snapshot();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(state.roundMessage).toBe("Accepted before mismatch");
    expect(state.scoreText).toContain("You: 1");
    expect(state.scoreText).toContain("Opponent: 0");
  });
});
