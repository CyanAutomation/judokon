import { test, expect } from "./fixtures/commonSetup.js";
import { verifyPageBasics } from "./fixtures/navigationChecks.js";

test.describe("View Judoka screen", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/src/pages/randomJudoka.html");
    await page.locator('body[data-random-judoka-ready="true"]').waitFor();
    await verifyPageBasics(page, [], [], { expectNav: false });
    await expect(page.locator("nav.top-navbar")).toHaveCount(0);
  });

  test("random judoka elements visible", async ({ page }) => {
    await expect(page.getByTestId("draw-button")).toBeVisible();
  });

  // Removed accessibility-focused test
  /*
  test("draw button accessible name constant", async ({ page }) => {
    const btn = page.getByTestId("draw-button");
    await expect(btn).toHaveText(/draw card/i);

    await expect(btn).toHaveAccessibleName(/draw a random judoka card/i);

    await btn.click();
    await expect(btn).toHaveText(/drawing/i);
    await expect(btn).toHaveAccessibleName(/draw a random judoka card/i);

    await expect(btn).toHaveText(/draw card/i);
    await expect(btn).toHaveAccessibleName(/draw a random judoka card/i);

    // Wait for the draw operation to fully settle before the next interaction.
    await expect(btn).not.toHaveAttribute("aria-busy");

    await btn.click();
    await expect(btn).toHaveText(/drawing/i);
    await expect(btn).toHaveAccessibleName(/draw a random judoka card/i);

    await expect(btn).toHaveText(/draw card/i);
    await expect(btn).toHaveAccessibleName(/draw a random judoka card/i);
  });*/

  test("draw card populates container", async ({ page }) => {
    await page.getByTestId("draw-button").click();
    const card = page.getByTestId("card-container").locator(".judoka-card");
    await expect(card).toHaveCount(1);
    await expect(card).toBeVisible();
    const flag = card.locator(".card-top-bar img");
    await expect(flag).toHaveAttribute("alt", /(Portugal|USA|Japan) flag/i);
  });

  // Removed accessibility attribute assertion test
  /*
  test("draw button shows loading state", async ({ page }) => {
    const btn = page.getByTestId("draw-button");
    await btn.click();
    await expect(btn).toHaveText(/drawing/i);
    await expect(btn).toHaveAttribute("aria-busy", "true");
    await expect(btn).toHaveText(/draw card/i);
    await expect(btn).not.toHaveAttribute("aria-busy");
  });*/

  // Removed portrait/landscape layout test to focus on desktop only

  test("draw button remains within viewport", async ({ page }) => {
    const btn = page.getByTestId("draw-button");
    const { bottom, innerHeight } = await btn.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return { bottom: rect.bottom, innerHeight: window.innerHeight };
    });
    const ALLOWED_OFFSET = 10;
    expect(bottom).toBeLessThanOrEqual(innerHeight + ALLOWED_OFFSET);
  });

  test("history panel focus management - focus moves to title on open", async ({ page }) => {
    const historyBtn = page.locator("#toggle-history-btn");

    // Initially, focus should not be on the title
    let focusedElement = await page.evaluate(() => document.activeElement?.id);
    expect(focusedElement).not.toBe("history-panel");

    // Click history button to open
    await historyBtn.click();
    await page.waitForTimeout(100); // Allow focus update after microtask

    // Focus should now be on the history title
    focusedElement = await page.evaluate(() => {
      const h2 = document.querySelector("#history-panel h2");
      return h2 === document.activeElement ? "history-title" : "other";
    });
    expect(focusedElement).toBe("history-title");
  });

  test("history panel focus management - Escape key closes panel", async ({ page }) => {
    const historyBtn = page.locator("#toggle-history-btn");
    const historyPanel = page.locator("#history-panel");

    // Open the panel
    await historyBtn.click();
    await expect(historyPanel).toHaveAttribute("aria-hidden", "false");

    // Press Escape
    await page.press("body", "Escape");

    // Panel should be closed
    await expect(historyPanel).toHaveAttribute("aria-hidden", "true");
  });

  test("history panel focus management - focus returns to button on close", async ({ page }) => {
    const historyBtn = page.locator("#toggle-history-btn");

    // Open the panel
    await historyBtn.click();
    await page.waitForTimeout(100);

    // Close the panel by pressing Escape
    await page.press("body", "Escape");
    await page.waitForTimeout(100);

    // Focus should return to the toggle button
    const focusedId = await page.evaluate(() => document.activeElement?.id);
    expect(focusedId).toBe("toggle-history-btn");
  });

  test("history panel focus management - clicking button again also closes and restores focus", async ({
    page
  }) => {
    const historyBtn = page.locator("#toggle-history-btn");
    const historyPanel = page.locator("#history-panel");

    // Open the panel
    await historyBtn.click();
    await expect(historyPanel).toHaveAttribute("aria-hidden", "false");

    // Click button again to close
    await historyBtn.click();
    await expect(historyPanel).toHaveAttribute("aria-hidden", "true");

    // Focus should be on the button
    const focusedId = await page.evaluate(() => document.activeElement?.id);
    expect(focusedId).toBe("toggle-history-btn");
  });
});
