import { test, expect } from "../fixtures/commonSetup.js";
import { waitForBattleState } from "../helpers/battleStateHelper.js";

test.describe("Classic Battle - Immediate Button State After Click", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
      window.__TEST__ = true;
      window.process = window.process || {};
      window.process.env = { ...(window.process.env || {}), VITEST: "true" };
    });
    await page.goto("/src/pages/battleClassic.html");

    // Start the match via modal
    await expect(page.getByRole("button", { name: "Medium" })).toBeVisible();
    await page.getByRole("button", { name: "Medium" }).click();
  });

  test("button state check", async ({ page }) => {
    // Wait for stat buttons to be enabled
    const statButtons = page.getByTestId("stat-button");
    await waitForBattleState(page, "waitingForPlayerAction");
    await expect(statButtons.first()).toBeEnabled();

    // Click and check IMMEDIATELY
    await statButtons.first().click();

    // Check button state with ZERO delay
    const immediateState = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="stat-button"]');
      return {
        disabled: btn.disabled,
        hasDisabledAttr: btn.hasAttribute("disabled"),
        hasDisabledClass: btn.classList.contains("disabled")
      };
    });

    console.log("Immediate state (sync):", JSON.stringify(immediateState, null, 2));

    // Wait 10ms and check again
    await page.waitForTimeout(10);
    const after10ms = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="stat-button"]');
      return {
        disabled: btn.disabled,
        hasDisabledAttr: btn.hasAttribute("disabled"),
        hasDisabledClass: btn.classList.contains("disabled")
      };
    });

    console.log("After 10ms:", JSON.stringify(after10ms, null, 2));

    // Wait 100ms and check again
    await page.waitForTimeout(90);
    const after100ms = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="stat-button"]');
      return {
        disabled: btn.disabled,
        hasDisabledAttr: btn.hasAttribute("disabled"),
        hasDisabledClass: btn.classList.contains("disabled")
      };
    });

    console.log("After 100ms:", JSON.stringify(after100ms, null, 2));

    // Get the stack traces
    const stackTraces = await page.evaluate(() => {
      return (window.__enableStackTraces || []).map((entry) => ({
        time: entry.time,
        stack: entry.stack.split("\n").slice(1, 4).join("\n")
      }));
    });

    console.log("\nStack traces for enableStatButtons calls:");
    stackTraces.forEach((entry, i) => {
      console.log(`\nCall ${i + 1}:`);
      console.log(entry.stack);
    });

    // Get the statButtons:enable events
    const enableEvents = await page.evaluate(() => {
      return window.__statButtonsEnableEvents || [];
    });

    console.log("\nstatButtons:enable events:");
    enableEvents.forEach((event, i) => {
      console.log(`Event ${i + 1}:`, JSON.stringify(event, null, 2));
    });
  });
});
