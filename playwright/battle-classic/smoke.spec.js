import { test, expect } from "@playwright/test";
import { waitForBattleReady } from "../helpers/battleStateHelper.js";

const showLogsInBrowser = typeof process !== "undefined" && process?.env?.SHOW_TEST_LOGS === "true";

// Benign message patterns to filter out during debug logging
const BENIGN_MESSAGE_PATTERNS = {
  noisyResource404: /Failed to load resource: the server responded with a status of 404/i,
  benignCountryMapping: /countryCodeMapping\.json/i,
  benignNavFallback: /Failed to fetch (navigation items|game modes), falling back to import/i
};

test.describe("Classic Battle page", () => {
  test("plays a full match and shows the end modal", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        showRoundSelectModal: true
      };
    });

    if (showLogsInBrowser) {
      page.on("console", (message) => {
        const type = message.type();
        if (type !== "warning" && type !== "error") return;

        const text = message.text();
        const isNoisyResource404 = BENIGN_MESSAGE_PATTERNS.noisyResource404.test(text);
        const isBenignCountryMapping = BENIGN_MESSAGE_PATTERNS.benignCountryMapping.test(text);
        const isBenignNavFallback = BENIGN_MESSAGE_PATTERNS.benignNavFallback.test(text);
        if (isNoisyResource404 || isBenignCountryMapping || isBenignNavFallback) {
          return;
        }

        const log = type === "error" ? console.error : console.warn;
        log(`[browser:${type}]`, text);
      });
    }

    await page.goto("/src/pages/battleClassic.html");

    // 1. Click the round select button for a quick match
    await page.locator('button:has-text("Quick")').click();

    await waitForBattleReady(page, { allowFallback: false });

    const getBattleState = () => page.evaluate(() => document.body?.dataset?.battleState ?? "");
    const terminalStates = ["matchDecision", "matchSummary", "matchComplete"];
    const waitForNextRoundState = async () => {
      const stateHandle = await page.waitForFunction(
        (states) => {
          const state = document.body?.dataset?.battleState ?? "";
          if (states.includes(state)) {
            return { state, terminal: true };
          }
          if (state === "waitingForPlayerAction") {
            return { state, terminal: false };
          }
          return false;
        },
        terminalStates,
        { timeout: 15000 }
      );

      return stateHandle.jsonValue();
    };

    // Play until the match ends
    for (let i = 0; i < 10; i++) {
      // Max 10 rounds to prevent infinite loop
      // 2. Wait for the stat buttons to be ready
      await page.waitForSelector('[data-buttons-ready="true"]');

      // 3. Click the first stat button
      await page.locator('[data-testid="stat-button"]').first().click();

      // Wait for the orchestrator to progress out of the selection state
      await expect.poll(getBattleState, { timeout: 15000 }).not.toBe("waitingForPlayerAction");

      const { terminal } = await waitForNextRoundState();
      if (terminal) {
        await expect(page.locator("#match-end-modal")).toBeVisible({ timeout: 15000 });
        break;
      }

      // Wait for the next round to become ready before continuing
      await expect.poll(getBattleState, { timeout: 15000 }).toBe("waitingForPlayerAction");
    }

    // Assert that the end modal is visible
    await expect(page.locator("#match-end-modal")).toBeVisible();

    // Assert that the showEndModal function incremented its structured counter
    const callCount = await page.evaluate(() => window.__classicBattleEndModalCount ?? 0);
    expect(callCount).toBeGreaterThan(0);
  });
});
