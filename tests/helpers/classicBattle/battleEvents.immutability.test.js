import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetBattleEventTarget,
  emitBattleEvent,
  emitBattleEventWithAliases,
  onBattleEvent
} from "../../../src/helpers/classicBattle/battleEvents.js";

describe("battleEvents payload immutability", () => {
  beforeEach(() => {
    __resetBattleEventTarget();
  });

  it("clones payloads so subscriber mutation attempts cannot alter emitter-owned state", () => {
    const sourcePayload = {
      roundIndex: 1,
      scores: {
        player: 2,
        opponent: 0
      }
    };

    const observedValues = [];

    onBattleEvent("round.evaluated", (event) => {
      observedValues.push(event.detail.scores.player);
      try {
        event.detail.scores.player = 99;
      } catch {}
      observedValues.push(event.detail.scores.player);
    });

    emitBattleEvent("round.evaluated", sourcePayload);

    expect(sourcePayload.scores.player).toBe(2);
    expect(observedValues).toEqual([2, 2]);
  });

  it("freezes payloads in Vitest mode to surface mutation attempts", () => {
    const frozenChecks = vi.fn();

    onBattleEvent("round.started", (event) => {
      frozenChecks(Object.isFrozen(event.detail), Object.isFrozen(event.detail.meta));
      try {
        event.detail.meta.source = "mutated";
      } catch {}
      expect(event.detail.meta.source).toBe("engine");
    });

    emitBattleEvent("round.started", {
      roundIndex: 3,
      meta: {
        source: "engine"
      }
    });

    expect(frozenChecks).toHaveBeenCalledWith(true, true);
  });

  it("emits alias payloads as isolated immutable clones", () => {
    const payload = {
      meta: {
        winner: "player"
      }
    };

    const aliasObserver = vi.fn();

    onBattleEvent("timer.roundExpired", (event) => {
      try {
        event.detail.meta.winner = "opponent";
      } catch {}
      expect(event.detail.meta.winner).toBe("player");
    });

    onBattleEvent("roundTimeout", (event) => {
      aliasObserver(event.detail.meta.winner, Object.isFrozen(event.detail.meta));
    });

    emitBattleEventWithAliases("timer.roundExpired", payload, { warnDeprecated: false });

    expect(aliasObserver).toHaveBeenCalledWith("player", true);
    expect(payload.meta.winner).toBe("player");
  });
});
