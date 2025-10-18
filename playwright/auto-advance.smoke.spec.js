// Playwright smoke test: verifies inter-round cooldown auto-advances
import { test, expect } from "@playwright/test";

const WAIT_FOR_ADVANCE_TIMEOUT = 15_000;

test.describe("Classic Battle – auto-advance", () => {
  test("shows countdown and auto-advances without Next", async ({ page }) => {
    await page.goto("/index.html");

    // Navigate to Classic Battle if needed
    let startBtn = await page.$('[data-testid="start-classic"]');
    if (startBtn) {
      await startBtn.click();
    } else {
      // Fallback: click by text selector
      startBtn = await page.getByText("Classic Battle").first();
      await startBtn.click();
    }

    // Wait for round to start
    const roundMsg = page.locator('#round-message, [data-testid="round-message"]');
    // If round message not present, rely on round counter change
    const roundCounter = page.locator('[data-testid="round-counter"], #round-counter');
    await expect(roundMsg).toBeVisible({ timeout: 10000 });

    // Drive end-of-round deterministically via test API if exposed; otherwise select a stat
    await page.waitForLoadState("networkidle");
    const roundFinishedViaTestApi = await page.evaluate(async () => {
      try {
        const finish = window.__TEST__?.round?.finish;
        if (typeof finish === "function") {
          await finish.call(window.__TEST__.round);
          return true;
        }
      } catch {}
      return false;
    });

    if (!roundFinishedViaTestApi) {
      // Select the first available stat to complete the round naturally
      const firstStat = page.locator("#stat-buttons button").first();
      await expect(firstStat).toBeVisible();
      await expect(firstStat).toBeEnabled();
      await firstStat.click({ trial: true });
      await firstStat.click();
    }

    // Expect a countdown snackbar to appear
    // Prefer specific countdown element to avoid strict mode violations
    const countdown = page.locator('[data-testid="next-round-timer"], #next-round-timer');
    const beforeRoundCounter = (await roundCounter.textContent().catch(() => null))?.trim() || "";
    const beforeRoundMessage = (await roundMsg.textContent().catch(() => null))?.trim() || "";
    const { battleState: beforeBattleState, hasEnabledStatButtons: hadEnabledStatButtonsBefore } =
      (await page.evaluate(() => {
        const bodyState = document.body?.dataset?.battleState || null;
        const attrState =
          document.querySelector("[data-battle-state]")?.getAttribute("data-battle-state") || null;
        const battleState = bodyState || attrState || "";
        const hasEnabledStatButtons = Array.from(
          document.querySelectorAll("#stat-buttons button, [data-testid=\"stat-button\"]")
        ).some((button) => !button.disabled);

        return { battleState, hasEnabledStatButtons };
      })) || { battleState: "", hasEnabledStatButtons: false };

    let cooldownReachedViaApi = false;
    const apiResult = await page.evaluate(async (waitTimeout) => {
      try {
        const stateApi = window.__TEST_API?.state;
        if (stateApi && typeof stateApi.waitForBattleState === "function") {
          return await stateApi.waitForBattleState.call(stateApi, "cooldown", waitTimeout);
        }
      } catch {}
      return null;
    }, WAIT_FOR_ADVANCE_TIMEOUT);
    cooldownReachedViaApi = apiResult === true;

    if (!cooldownReachedViaApi) {
      await expect
        .poll(
          () =>
            page.evaluate(() => {
              const bodyState = document.body?.dataset?.battleState || null;
              const attrState =
                document.querySelector("[data-battle-state]")?.getAttribute("data-battle-state") ||
                null;
              return bodyState || attrState || "";
            }),
          {
            message: "expected DOM battle state to reach cooldown",
            timeout: WAIT_FOR_ADVANCE_TIMEOUT
          }
        )
        .toBe("cooldown");
    }

    await expect(countdown).toBeVisible({ timeout: 5000 });

    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const el =
              document.querySelector('[data-testid="next-round-timer"]') ||
              document.getElementById("next-round-timer");
            return el?.textContent?.trim() || "";
          }),
        { message: "expected cooldown timer to populate", timeout: WAIT_FOR_ADVANCE_TIMEOUT }
      )
      .not.toBe("");

    await expect
      .poll(
        async () => {
          const [counterText, messageText, stateInfo] = await Promise.all([
            roundCounter.textContent().catch(() => null),
            roundMsg.textContent().catch(() => null),
            page.evaluate(() => {
              const bodyState = document.body?.dataset?.battleState || null;
              const attrState =
                document
                  .querySelector("[data-battle-state]")
                  ?.getAttribute("data-battle-state") || null;
              const battleState = bodyState || attrState || "";
              const hasEnabledStatButtons = Array.from(
                document.querySelectorAll("#stat-buttons button, [data-testid=\"stat-button\"]")
              ).some((button) => !button.disabled);

              return { battleState, hasEnabledStatButtons };
            })
          ]);
          const counter = (counterText || "").trim();
          const message = (messageText || "").trim();
          const battleState = stateInfo?.battleState || "";
          const hasEnabledStatButtons = Boolean(stateInfo?.hasEnabledStatButtons);

          const counterChanged = beforeRoundCounter && counter && counter !== beforeRoundCounter;
          const messageChanged = beforeRoundMessage && message && message !== beforeRoundMessage;
          const messageAppeared = !beforeRoundMessage && message && message !== beforeRoundCounter;
          const messageCleared = Boolean(beforeRoundMessage && !message);
          const waitingForPlayerAction = battleState === "waitingForPlayerAction";
          const battleStateAdvanced = waitingForPlayerAction && beforeBattleState !== "waitingForPlayerAction";
          const statButtonsReenabled = hasEnabledStatButtons && !hadEnabledStatButtonsBefore;

          return Boolean(
            counterChanged ||
              messageChanged ||
              messageAppeared ||
              messageCleared ||
              battleStateAdvanced ||
              statButtonsReenabled
          );
        },
        { message: "expected round message/counter to update", timeout: WAIT_FOR_ADVANCE_TIMEOUT }
      )
      .toBe(true);
  });
});
