import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";

import {
  __resetBattleEventTarget,
  emitBattleEvent
} from "../../src/helpers/classicBattle/battleEvents.js";
import { mount, clearBody } from "./domUtils.js";

describe("battleScoreboard PRD adapter", () => {
  beforeEach(async () => {
    __resetBattleEventTarget();
    const { container } = mount();
    const header = document.createElement("header");
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
    const mock = await import("./mockScheduler.js");
    const { initBattleScoreboardAdapter } = await import("../../src/helpers/battleScoreboard.js");
    initBattleScoreboardAdapter({ scheduler: mock.createMockScheduler() });
  });

  afterEach(async () => {
    const { disposeBattleScoreboardAdapter } = await import(
      "../../src/helpers/battleScoreboard.js"
    );
    disposeBattleScoreboardAdapter();
    vi.restoreAllMocks();
    clearBody();
  });

  it("updates round counter and scores from PRD events", async () => {
    emitBattleEvent("round.started", { roundIndex: 3 });
    expect(document.getElementById("round-counter").textContent).toBe("Round 3");

    emitBattleEvent("round.evaluated", {
      outcome: "winPlayer",
      scores: { player: 4, opponent: 2 }
    });

    const scoreText = document
      .getElementById("score-display")
      .textContent.replace(/\s+/g, " ")
      .trim();
    expect(scoreText).toContain("You: 4");
    expect(scoreText).toContain("Opponent: 2");
  });

  it("accepts supported catalog versions during subscription and runtime", async () => {
    const { disposeBattleScoreboardAdapter, initBattleScoreboardAdapter } = await import(
      "../../src/helpers/battleScoreboard.js"
    );
    disposeBattleScoreboardAdapter();
    initBattleScoreboardAdapter({ catalogVersion: "v2" });

    emitBattleEvent("round.started", { roundIndex: 2, catalogVersion: "v2" });
    emitBattleEvent("round.evaluated", {
      catalogVersion: "v2",
      scores: { player: 3, opponent: 1 }
    });

    const scoreText = document
      .getElementById("score-display")
      .textContent.replace(/\s+/g, " ")
      .trim();
    expect(document.getElementById("round-counter").textContent).toBe("Round 2");
    expect(scoreText).toContain("You: 3");
    expect(scoreText).toContain("Opponent: 1");
  });

  it("renders degraded fallback and logs once for bootstrap catalog mismatch", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { disposeBattleScoreboardAdapter, initBattleScoreboardAdapter } = await import(
      "../../src/helpers/battleScoreboard.js"
    );

    disposeBattleScoreboardAdapter();
    initBattleScoreboardAdapter({ catalogVersion: "v999" });
    initBattleScoreboardAdapter({ catalogVersion: "v999" });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const roundMessage = document.getElementById("round-message").textContent;
    expect(roundMessage).toContain("Scoreboard unavailable");
  });

  it("prevents partial processing when runtime catalog version is incompatible", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    emitBattleEvent("round.evaluated", {
      catalogVersion: "v2",
      scores: { player: 1, opponent: 0 }
    });

    emitBattleEvent("round.evaluated", {
      catalogVersion: "v999",
      scores: { player: 8, opponent: 8 }
    });

    // Adapter should be disposed after mismatch, so this should not be processed.
    emitBattleEvent("round.evaluated", {
      catalogVersion: "v2",
      scores: { player: 9, opponent: 9 }
    });

    const scoreText = document
      .getElementById("score-display")
      .textContent.replace(/\s+/g, " ")
      .trim();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(scoreText).toContain("You: 1");
    expect(scoreText).toContain("Opponent: 0");
    expect(scoreText).not.toContain("You: 9");
  });

  it("disposes listeners and stops updating", async () => {
    const { disposeBattleScoreboardAdapter } = await import(
      "../../src/helpers/battleScoreboard.js"
    );
    emitBattleEvent("round.evaluated", { scores: { player: 1, opponent: 0 } });
    disposeBattleScoreboardAdapter();
    emitBattleEvent("round.evaluated", { scores: { player: 2, opponent: 2 } });

    const scoreText = document
      .getElementById("score-display")
      .textContent.replace(/\s+/g, " ")
      .trim();
    expect(scoreText).toContain("You: 1");
    expect(scoreText).toContain("Opponent: 0");
  });
});
