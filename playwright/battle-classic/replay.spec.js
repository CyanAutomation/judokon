import { test, expect } from "../fixtures/commonSetup.js";
import selectors from "../../playwright/helpers/selectors";
import { waitForBattleReady } from "../helpers/battleStateHelper.js";
import { withMutedConsole } from "../../tests/utils/console.js";

const ENGINE_WAIT_TIMEOUT_MS = 5_000;

test.describe("Classic Battle replay", () => {
  test("Replay resets scoreboard after match end", async ({ page }) => {
    // Temporarily disable console muting for debugging
    // await withMutedConsole(async () => {
      await page.addInitScript(() => {
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
        window.__OPPONENT_RESOLVE_DELAY_MS = 500; // 500ms delay before opponent reveals choice

        const readScores = (engineApi) => {
          if (engineApi && typeof engineApi.getScores === "function") {
            try {
              const scores = engineApi.getScores();
              if (scores && typeof scores === "object") {
                const player = Number(scores.playerScore ?? scores.player);
                const opponent = Number(scores.opponentScore ?? scores.opponent);
                if (Number.isFinite(player) && Number.isFinite(opponent)) {
                  return { player, opponent };
                }
              }
            } catch {
              // Ignore engine score retrieval errors and fall back to inspect API.
            }
          }

          // Fallback to inspect API when engine API is unavailable or fails
          const inspectApi = window.__TEST_API?.inspect;
          const snapshot =
            inspectApi && typeof inspectApi.getBattleSnapshot === "function"
              ? inspectApi.getBattleSnapshot()
              : null;
          if (!snapshot || typeof snapshot !== "object") {
            return null;
          }
          const player = Number(
            snapshot.playerScore !== null && snapshot.playerScore !== undefined
              ? snapshot.playerScore
              : (snapshot.player ?? 0)
          );
          const opponent = Number(
            snapshot.opponentScore !== null && snapshot.opponentScore !== undefined
              ? snapshot.opponentScore
              : (snapshot.opponent ?? 0)
          );
          if (!Number.isFinite(player) || !Number.isFinite(opponent)) {
            return null;
          }
          return { player, opponent };
        };

        const captureEngineState = () => {
          const engineApi = window.__TEST_API?.engine;
          if (!engineApi) {
            return { ok: false, reason: "ENGINE_API_UNAVAILABLE" };
          }

          const scores = readScores(engineApi);
          if (!scores) {
            return { ok: false, reason: "SCORES_UNAVAILABLE" };
          }

          const roundsPlayed =
            typeof engineApi.getRoundsPlayed === "function" ? engineApi.getRoundsPlayed() : null;

          return {
            ok: true,
            scores,
            roundsPlayed:
              typeof roundsPlayed === "number" && Number.isFinite(roundsPlayed)
                ? roundsPlayed
                : null
          };
        };

        window.__PW_CLASSIC_BATTLE = {
          ...(window.__PW_CLASSIC_BATTLE || {}),
          readScores,
          captureEngineState
        };
      });
      await page.goto("/src/pages/battleClassic.html");

      await waitForBattleReady(page, { allowFallback: false });

      const setQuickMatch = await page.evaluate(() => {
        const engineApi = window.__TEST_API?.engine;
        if (!engineApi) {
          return { applied: false, error: "ENGINE_API_UNAVAILABLE" };
        }

        const success = engineApi.setPointsToWin(1);
        const current = engineApi.getPointsToWin();

        return { applied: success && current === 1, error: success ? null : "SET_FAILED" };
      });

      if (!setQuickMatch.applied) {
        throw new Error(`Failed to configure quick match: ${setQuickMatch.error}`);
      }

      // Start match
      await page.click("#round-select-2");
      
      // Ensure stats buttons are visible and battle is fully initialized
      // This must happen AFTER clicking the round button
      try {
        await waitForBattleReady(page, { timeout: ENGINE_WAIT_TIMEOUT_MS, allowFallback: false });
      } catch {
        // Fallback: just wait for stats buttons to be visible
        await expect(page.locator(selectors.statButton()).first()).toBeVisible({
          timeout: ENGINE_WAIT_TIMEOUT_MS
        });
      }
      
      // Capture initial engine-reported state via page evaluation
      const initialEngineState = await page.evaluate(() => {
        const captureState = window.__PW_CLASSIC_BATTLE?.captureEngineState;
        if (typeof captureState !== "function") {
          return { ok: false, reason: "CAPTURE_HELPER_UNAVAILABLE" };
        }
        const result = captureState();
        
        // If capture failed, gather diagnostic info
        if (!result.ok) {
          const engineApi = window.__TEST_API?.engine;
          const inspectApi = window.__TEST_API?.inspect;
          const snapshot = inspectApi?.getBattleSnapshot?.();
          result.diagnostics = {
            engineAvailable: !!engineApi,
            inspectAvailable: !!inspectApi,
            snapshotAvailable: !!snapshot,
            snapshotKeys: snapshot ? Object.keys(snapshot) : null,
            snapshotData: snapshot
          };
        }
        
        return result;
      });

      if (!initialEngineState?.ok || !initialEngineState.scores) {
        const reason = initialEngineState?.reason ?? "UNKNOWN_ENGINE_STATE";
        const diag = initialEngineState?.diagnostics
          ? JSON.stringify(initialEngineState.diagnostics)
          : "NO_DIAGNOSTICS";
        throw new Error(`Unable to capture initial engine scores: ${reason}\nDiagnostics: ${diag}`);
      }

      const initialRoundsPlayed = initialEngineState.roundsPlayed ?? 0;
      const targetRounds = initialRoundsPlayed + 1;
      let finalEngineState = null;
      const statButtons = page.locator(selectors.statButton());
      const maxAttempts = Math.min(await statButtons.count(), 3);
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        await statButtons.nth(attempt).click();
        const waitResult = await page.evaluate(
          async ({ desiredRounds, waitTimeout }) => {
            const engineApi = window.__TEST_API?.engine;
            if (!engineApi || typeof engineApi.waitForRoundsPlayed !== "function") {
              return { ok: false, reason: "WAIT_HELPER_UNAVAILABLE" };
            }

            try {
              const completed = await engineApi.waitForRoundsPlayed(desiredRounds, waitTimeout);
              if (completed !== true) {
                return {
                  ok: false,
                  reason:
                    completed === false
                      ? `WAIT_TIMEOUT_ROUNDS_${desiredRounds}`
                      : "WAIT_HELPER_UNEXPECTED_RESULT"
                };
              }

              const captureState = window.__PW_CLASSIC_BATTLE?.captureEngineState;
              if (typeof captureState !== "function") {
                return { ok: false, reason: "CAPTURE_HELPER_UNAVAILABLE" };
              }

              const engineState = captureState();
              
              // Debug: also capture raw engine and snapshot data
              const debugInfo = {
                engineScores: window.__TEST_API?.engine?.getScores?.(),
                snapshotData: window.__TEST_API?.inspect?.getBattleSnapshot?.(),
                storeScores: {
                  player: window.battleStore?.playerScore,
                  opponent: window.battleStore?.opponentScore
                }
              };
              
              if (!engineState?.ok || !engineState.scores) {
                return {
                  ok: false,
                  reason: engineState?.reason ?? "ENGINE_STATE_UNAVAILABLE",
                  debugInfo
                };
              }

              return { ...engineState, debugInfo };
            } catch (error) {
              return {
                ok: false,
                reason: error instanceof Error ? error.message : String(error ?? "unknown")
              };
            }
          },
          { desiredRounds: targetRounds, waitTimeout: ENGINE_WAIT_TIMEOUT_MS }
        );

        if (waitResult?.ok && waitResult.scores) {
          finalEngineState = waitResult;
          break;
        }

        if (attempt === maxAttempts - 1) {
          const reason = waitResult?.reason ?? "UNKNOWN_WAIT_FAILURE";
          const debug = waitResult?.debugInfo
            ? `\nDebug: ${JSON.stringify(waitResult.debugInfo, null, 2)}`
            : "";
          throw new Error(`Failed to observe score change via engine API: ${reason}${debug}`);
        }
      }
      
      // Debug output before assertion
      console.log("[TEST] Initial engine state:", initialEngineState);
      console.log("[TEST] Final engine state:", finalEngineState);
      console.log("[TEST] Final debug info:", finalEngineState?.debugInfo);
      
      expect(finalEngineState?.scores).toBeDefined();
      expect(finalEngineState.scores).not.toEqual(initialEngineState.scores);
      if (typeof finalEngineState?.roundsPlayed === "number") {
        expect(finalEngineState.roundsPlayed).toBeGreaterThanOrEqual(targetRounds);
      }
      const pointsBeforeReplay = await page.evaluate(() => {
        const engineApi = window.__TEST_API?.engine;
        if (!engineApi || typeof engineApi.getPointsToWin !== "function") return null;
        return engineApi.getPointsToWin();
      });

      // Click Replay and assert round counter resets
      await page.getByTestId("replay-button").click();
      const engineStateAfterReplay = await page.evaluate(() => {
        const engineApi = window.__TEST_API?.engine;
        if (!engineApi) {
          return { roundsPlayed: null, pointsToWin: null };
        }
        return {
          roundsPlayed:
            typeof engineApi.getRoundsPlayed === "function" ? engineApi.getRoundsPlayed() : null,
          pointsToWin:
            typeof engineApi.getPointsToWin === "function" ? engineApi.getPointsToWin() : null
        };
      });
      expect(engineStateAfterReplay?.roundsPlayed).toBeLessThanOrEqual(1);
      expect(engineStateAfterReplay?.pointsToWin).toBe(pointsBeforeReplay);
      await expect(page.locator(selectors.roundCounter())).toHaveText("Round 1");
    // }, ["log", "info", "warn", "error", "debug"]);
  });
});
