import { test, expect } from "@playwright/test";
import { withMutedConsole } from "../../tests/utils/console.js";

test.describe("Classic Battle round select", () => {
  test("user can select Long battle (15 points) and modal updates correctly", async ({ page }) => {
    await withMutedConsole(
      async () => {
        // Force the round select modal to show in Playwright tests
        await page.addInitScript(() => {
          window.__FF_OVERRIDES = { showRoundSelectModal: true };
        });

        // Navigate to battle page - modal should appear automatically
        await page.goto("/src/pages/battleClassic.html");

        // Wait for initialization to complete
        await page.waitForFunction(() => window.__battleInitComplete === true);

        // Wait for round selection modal to appear
        await expect(page.getByRole("dialog")).toBeVisible();
        await expect(page.getByText("Select Match Length")).toBeVisible();

        // Verify all round options are present
        await expect(page.getByRole("button", { name: "Quick" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Medium" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Long" })).toBeVisible();

        // Click the Long option (15 points)
        await page.getByRole("button", { name: "Long" }).click();

        // Verify modal is dismissed
        await expect(page.getByRole("dialog")).not.toBeVisible();

        // Verify battle state is updated (body should have target data attribute)
        await expect(page.locator("body")).toHaveAttribute("data-target", "15");

        // Verify round counter shows initial state
        await expect(page.getByTestId("round-counter")).toContainText("Round 1");

        // Verify score display shows initial scores
        await expect(page.getByTestId("score-display")).toContainText("You: 0 Opponent: 0");
      },
      ["log", "info", "warn", "error", "debug"]
    );
  });

  test("keyboard navigation works in round select modal", async ({ page }) => {
    await withMutedConsole(
      async () => {
        // Force the round select modal to show in Playwright tests
        await page.addInitScript(() => {
          window.__FF_OVERRIDES = { showRoundSelectModal: true };
        });

        await page.goto("/src/pages/battleClassic.html");

        // Wait for initialization to complete
        await page.waitForFunction(() => window.__battleInitComplete === true);

        // Wait for modal
        await expect(page.getByRole("dialog")).toBeVisible();

        // Focus on the first button and test arrow key navigation
        const quickButton = page.getByRole("button", { name: "Quick" });
        await quickButton.focus();
        await expect(quickButton).toBeFocused();

        // Navigate with arrow keys
        await page.keyboard.press("ArrowDown");
        await expect(page.getByRole("button", { name: "Medium" })).toBeFocused();

        await page.keyboard.press("ArrowDown");
        await expect(page.getByRole("button", { name: "Long" })).toBeFocused();

        await page.keyboard.press("ArrowUp");
        await expect(page.getByRole("button", { name: "Medium" })).toBeFocused();

        // Select with Enter key
        await page.keyboard.press("Enter");

        // Verify modal is dismissed
        await expect(page.getByRole("dialog")).not.toBeVisible();
      },
      ["log", "info", "warn", "error", "debug"]
    );
  });
});
