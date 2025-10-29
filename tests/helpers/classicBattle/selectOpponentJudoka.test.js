import { describe, expect, it, vi } from "vitest";
import { selectOpponentJudoka } from "../../../src/helpers/classicBattle/cardSelection.js";

describe("selectOpponentJudoka callbacks", () => {
  it("rejects duplicate player candidates and accepts the next unique opponent", async () => {
    const player = { id: "judoka-1", name: "Player", isHidden: false };
    const alternate = { id: "judoka-2", name: "Opponent", isHidden: false };
    const available = [player, alternate];
    const randomSequence = [player, alternate];
    const randomJudoka = vi.fn(() => randomSequence.shift() ?? null);
    const onCandidateAccepted = vi.fn();
    const onCandidateRejected = vi.fn();

    const result = await selectOpponentJudoka({
      availableJudoka: available,
      playerJudoka: player,
      randomJudoka,
      onCandidateAccepted,
      onCandidateRejected,
      fallbackProvider: async () => null,
      qaLogger: vi.fn()
    });

    expect(result).toEqual(alternate);
    expect(onCandidateRejected).toHaveBeenCalledWith(player, { reason: "sameAsPlayer" });
    expect(onCandidateAccepted).toHaveBeenCalledWith(alternate, { isFallback: false });
  });

  it("invokes fallback acceptance when random selection fails", async () => {
    const player = { id: "judoka-1", name: "Player", isHidden: false };
    const fallback = { id: "fallback-judoka", name: "Fallback", isHidden: false };
    const randomJudoka = vi.fn(() => null);
    const onCandidateAccepted = vi.fn();
    const onCandidateRejected = vi.fn();

    const result = await selectOpponentJudoka({
      availableJudoka: [],
      playerJudoka: player,
      randomJudoka,
      onCandidateAccepted,
      onCandidateRejected,
      fallbackProvider: async () => fallback,
      qaLogger: vi.fn()
    });

    expect(result).toEqual(fallback);
    expect(onCandidateRejected).not.toHaveBeenCalled();
    expect(onCandidateAccepted).toHaveBeenCalledWith(fallback, { isFallback: true });
  });
});
