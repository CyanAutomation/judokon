import { test, expect } from "./fixtures/commonSetup.js";

test.describe("Debug stat click", () => {
  test("investigate stat button click behavior", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem(
        "settings",
        JSON.stringify({
          featureFlags: {
            enableTestMode: { enabled: true },
            autoSelect: { enabled: false },
            opponentDelayMessage: { enabled: true }
          }
        })
      );
    });

    await page.goto("/src/pages/battleClassic.html");

    // Wait for buttons to be ready
    const firstStat = page.getByRole("button", { name: /power/i }).first();
    await expect(firstStat).toBeVisible();
    await expect(page.locator("#stat-buttons")).toHaveAttribute("data-buttons-ready", "true");

    // Check initial state
    const initialState = await page.evaluate(() => {
      return {
        bodyDataStatSelected: document.body.dataset.statSelected,
        battleState: document.body.dataset.battleState,
        testApiExists: !!window.__TEST_API,
        snackbarText: document.querySelector("#snackbar-container .snackbar")?.textContent
      };
    });
    console.log("Initial state:", initialState);

    // Click the button
    await firstStat.click();

    // Wait a moment for any async operations
    await page.waitForTimeout(500);

    // Check state after click
    const afterClickState = await page.evaluate(() => {
      return {
        bodyDataStatSelected: document.body.dataset.statSelected,
        battleState: document.body.dataset.battleState,
        snackbarText: document.querySelector("#snackbar-container .snackbar")?.textContent,
        snackbarClasses: document.querySelector("#snackbar-container .snackbar")?.className
      };
    });
    console.log("After click state:", afterClickState);

    // Check if the stat was actually selected
    await expect(page.locator("body")).toHaveAttribute("data-stat-selected", "true");
  });
});
