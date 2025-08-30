import { test, expect } from "./fixtures/commonSetup.js";
import { waitForBattleState } from "./fixtures/waits.js";

test("does not auto-select when flag disabled", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "settings",
      JSON.stringify({
        featureFlags: {
          enableTestMode: { enabled: true },
          autoSelect: { enabled: false }
        }
      })
    );
    window.__NEXT_ROUND_COOLDOWN_MS = 0;
  });
  await page.goto("/src/pages/battleCLI.html");
  await waitForBattleState(page, "waitingForPlayerAction", 15000);
  await waitForBattleState(page, "interruptRound", 10000);
  await expect(page.locator("#round-message")).toContainText(/Round interrupted/i);
});
