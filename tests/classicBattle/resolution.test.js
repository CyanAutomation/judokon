import { resetFallbackScores } from "../../src/helpers/api/battleUI.js";
import { getState as getScoreboardState } from "../../src/components/Scoreboard.js";
import { waitFor } from "../waitFor.js";
import { getScores } from "../../src/helpers/battleEngineFacade.js";
import {
  bootstrapClassicBattlePage,
  mockRoundTimerDuration
} from "../helpers/classicBattle/realDom.js";
import { waitForBattleEventOnce } from "../helpers/classicBattle/battleEvents.js";

describe("Classic Battle round resolution", () => {
  test("auto-select on expiry resolves via battle state transitions", async () => {
    resetFallbackScores();
    const timerSpy = mockRoundTimerDuration(1, 3);
    const { cleanup } = await bootstrapClassicBattlePage();
    try {
      await waitFor(() => document.getElementById("round-select-2") !== null);
      const btn = /** @type {HTMLButtonElement|null} */ (document.getElementById("round-select-2"));
      expect(btn).toBeTruthy();
      const roundResolvedPromise = waitForBattleEventOnce("roundResolved");
      const nextRoundReadyPromise = waitForBattleEventOnce("nextRoundTimerReady");
      btn?.click();

      const roundResolvedEvent = await roundResolvedPromise;
      const nextRoundReadyEvent = await nextRoundReadyPromise;
      await waitFor(
        () => {
          const { player, opponent } = getScoreboardState().score;
          return player === 1 && opponent === 0;
        },
        { timeout: 2000 }
      );

      const resolvedDetail = roundResolvedEvent?.detail || {};
      const detailPlayerScore = Number(
        resolvedDetail.playerScore ?? resolvedDetail.result?.playerScore
      );
      const detailOpponentScore = Number(
        resolvedDetail.opponentScore ?? resolvedDetail.result?.opponentScore
      );
      expect(detailPlayerScore).toBe(1);
      expect(detailOpponentScore).toBe(0);
      const { playerScore: enginePlayerScore, opponentScore: engineOpponentScore } = getScores();
      expect(enginePlayerScore).toBe(1);
      expect(engineOpponentScore).toBe(0);
      expect(nextRoundReadyEvent.timeStamp).toBeGreaterThan(roundResolvedEvent.timeStamp);
    } finally {
      timerSpy.mockRestore();
      cleanup();
    }
  });
});
