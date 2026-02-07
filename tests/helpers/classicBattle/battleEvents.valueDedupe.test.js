import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetBattleEventTarget,
  emitBattleEvent,
  onBattleEvent
} from "../../../src/helpers/classicBattle/battleEvents.js";

describe("battleEvents value-only dedupe", () => {
  beforeEach(() => {
    __resetBattleEventTarget();
  });

  it("suppresses duplicate round.timer.tick events with same semantic payload", () => {
    const handler = vi.fn();
    onBattleEvent("round.timer.tick", handler);

    emitBattleEvent("round.timer.tick", { roundIndex: 1, remainingMs: 4000, payloadHash: "a" });
    emitBattleEvent("round.timer.tick", { roundIndex: 1, remainingMs: 4000, payloadHash: "a" });
    emitBattleEvent("round.timer.tick", { roundIndex: 1, remainingMs: 3000, payloadHash: "b" });

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("suppresses duplicate round.evaluated events with same round and payload version", () => {
    const handler = vi.fn();
    onBattleEvent("round.evaluated", handler);

    const duplicateDetail = {
      roundIndex: 2,
      payloadVersion: 3,
      payloadHash: "round-2-v3",
      scores: { player: 1, opponent: 0 },
      winner: "player"
    };

    emitBattleEvent("round.evaluated", duplicateDetail);
    emitBattleEvent("round.evaluated", { ...duplicateDetail });
    emitBattleEvent("round.evaluated", {
      ...duplicateDetail,
      payloadVersion: 4,
      payloadHash: "round-2-v4"
    });

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("suppresses duplicate display.score.update while allowing authoritative control.state.changed", () => {
    const scoreHandler = vi.fn();
    const controlHandler = vi.fn();

    onBattleEvent("display.score.update", scoreHandler);
    onBattleEvent("control.state.changed", controlHandler);

    emitBattleEvent("display.score.update", { player: 2, opponent: 1, version: 9 });
    emitBattleEvent("display.score.update", { player: 2, opponent: 1, version: 9 });

    emitBattleEvent("control.state.changed", { to: "roundResolve", roundIndex: 3 });
    emitBattleEvent("control.state.changed", { to: "roundResolve", roundIndex: 3 });

    expect(scoreHandler).toHaveBeenCalledTimes(1);
    expect(controlHandler).toHaveBeenCalledTimes(2);
  });
});
