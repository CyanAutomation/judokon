import { test, expect } from "./fixtures/battleCliFixture.js";
import { withMutedConsole } from "../tests/utils/console.js";

test.describe("Battle CLI countdown timing", () => {
  test("shows countdown ticks and advances to the next round", async ({ page }) =>
    withMutedConsole(async () => {
      await page.addInitScript(() => {
        const existingOverrides = typeof window !== "undefined" ? window.__FF_OVERRIDES || {} : {};
        window.__FF_OVERRIDES = { ...existingOverrides, selectionCountdownSeconds: 5 };
      });

      await page.goto("/src/pages/battleCLI.html?autostart=1");

      const countdown = page.locator("#cli-countdown");
      await expect(countdown).toBeVisible({ timeout: 5_000 });

      const readCountdownText = async () => {
        const text = (await countdown.textContent()) || "";
        const match = text.match(/Time remaining:\s*(\d+)/i);
        return match ? Number.parseInt(match[1], 10) : null;
      };

      await expect.poll(readCountdownText, { timeout: 6_000 }).toBeGreaterThanOrEqual(3);

      await expect.poll(readCountdownText, { timeout: 6_000 }).toBeLessThan(5);

      const statButton = page.locator(".cli-stat").first();
      await expect(statButton).toBeVisible({ timeout: 5_000 });
      await expect(statButton).toBeEnabled({ timeout: 5_000 });
      await statButton.click();

      await expect(page.locator("#snackbar-container .snackbar")).toHaveText(/You Picked:/, {
        timeout: 2_000
      });

      const completion = await page.evaluate(async () => {
        const api = window.__TEST_API?.cli;
        if (typeof api?.completeRound !== "function") {
          return { ok: false, reason: "completeRound unavailable" };
        }

        try {
          const result = await api.completeRound(
            {
              detail: {
                stat: "agi",
                playerVal: 88,
                opponentVal: 42,
                result: { message: "Round resolved", playerScore: 1, opponentScore: 0 }
              }
            },
            { opponentResolveDelayMs: 0 }
          );

          return { ok: true, finalState: result?.finalState ?? null };
        } catch (error) {
          return { ok: false, reason: error?.message ?? "completeRound failed" };
        }
      });

      expect(completion.ok).toBe(true);

      const roundCounter = page.getByTestId("round-counter");
      await expect(roundCounter).toHaveText(/Round\s+2/, { timeout: 6_000 });

      await expect(statButton).toBeEnabled({ timeout: 6_000 });
      await expect.poll(readCountdownText, { timeout: 5_000 }).toBeGreaterThanOrEqual(4);
    }, ["log", "warn", "error"]));
});
