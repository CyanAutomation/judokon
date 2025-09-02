// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

let timerApi;

beforeEach(() => {
  vi.resetModules();
  timerApi = null;
  vi.doMock("../../../src/helpers/timerUtils.js", async (importOriginal) => {
    const actual = await importOriginal();
    return {
      ...actual,
      createCountdownTimer: (duration, { onTick }) => {
        let remaining = duration;
        timerApi = {
          start: vi.fn(),
          stop: vi.fn(),
          pause: vi.fn(),
          resume: vi.fn(),
          tick() {
            remaining -= 1;
            if (onTick) onTick(remaining);
          }
        };
        return timerApi;
      }
    };
  });
});

describe("BattleEngine interrupts", () => {
  it("interruptRound stops timer and records reason", async () => {
    const { BattleEngine, OUTCOME } = await import("../../../src/helpers/BattleEngine.js");
    const engine = new BattleEngine();
    engine._resetForTest();
    await engine.startRound(
      () => {},
      () => {},
      5
    );
    engine.playerScore = 1;
    engine.opponentScore = 2;

    const result = engine.interruptRound("referee");

    expect(timerApi.stop).toHaveBeenCalled();
    expect(engine.roundInterrupted).toBe(true);
    expect(engine.lastInterruptReason).toBe("referee");
    expect(engine.timer.hasActiveTimer()).toBe(false);
    expect(result).toEqual({
      outcome: OUTCOME.INTERRUPT_ROUND,
      matchEnded: false,
      playerScore: 1,
      opponentScore: 2
    });
  });

  it("interruptMatch stops timer and ends match", async () => {
    const { BattleEngine, OUTCOME } = await import("../../../src/helpers/BattleEngine.js");
    const engine = new BattleEngine();
    engine._resetForTest();
    await engine.startRound(
      () => {},
      () => {},
      5
    );
    engine.playerScore = 3;
    engine.opponentScore = 4;

    const result = engine.interruptMatch("injury");

    expect(timerApi.stop).toHaveBeenCalled();
    expect(engine.matchEnded).toBe(true);
    expect(engine.lastInterruptReason).toBe("injury");
    expect(engine.timer.hasActiveTimer()).toBe(false);
    expect(result).toEqual({
      outcome: OUTCOME.INTERRUPT_MATCH,
      matchEnded: true,
      playerScore: 3,
      opponentScore: 4
    });
  });

  it("roundModification applies overrides and resetRound", async () => {
    const { BattleEngine, OUTCOME } = await import("../../../src/helpers/BattleEngine.js");
    const engine = new BattleEngine();
    engine._resetForTest();
    await engine.startRound(
      () => {},
      () => {},
      5
    );
    engine.roundInterrupted = true;

    const modification = {
      playerScore: 5,
      opponentScore: 1,
      roundsPlayed: 2,
      resetRound: true
    };

    const result = engine.roundModification(modification);

    expect(timerApi.stop).toHaveBeenCalled();
    expect(engine.playerScore).toBe(5);
    expect(engine.opponentScore).toBe(1);
    expect(engine.roundsPlayed).toBe(2);
    expect(engine.roundInterrupted).toBe(false);
    expect(result).toEqual({
      outcome: OUTCOME.ROUND_MODIFIED,
      matchEnded: false,
      playerScore: 5,
      opponentScore: 1
    });
  });

  it("resetInterrupts clears flags", async () => {
    const { BattleEngine } = await import("../../../src/helpers/BattleEngine.js");
    const engine = new BattleEngine();
    engine.roundInterrupted = true;
    engine.lastInterruptReason = "pause";
    engine.lastError = "oops";

    engine.resetInterrupts();

    expect(engine.roundInterrupted).toBe(false);
    expect(engine.lastInterruptReason).toBe("");
    expect(engine.lastError).toBe("");
  });
});
