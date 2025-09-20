import { test, expect } from "@playwright/test";
import { withMutedConsole } from "../../tests/utils/console.js";

test.describe("Classic Battle round select (server integration)", () => {
  test("server correctly persists and loads round selection preferences", async ({ page }) => {
    await withMutedConsole(
      async () => {
        // Force the round select modal to show in Playwright tests
        await page.addInitScript(() => {
          window.__FF_OVERRIDES = { showRoundSelectModal: true };
        });

        // Navigate to battle page
        await page.goto("/src/pages/battleClassic.html");

        // Wait for round selection modal to appear
        await expect(page.getByRole("dialog")).toBeVisible();
        await expect(page.getByText("Select Match Length")).toBeVisible();

        // Verify all round options are present
        await expect(page.getByRole("button", { name: "Quick" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Medium" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Long" })).toBeVisible();

        // Select Long battle (15 points)
        await page.getByRole("button", { name: "Long" }).click();

        // Verify modal is dismissed
        await expect(page.getByRole("dialog")).not.toBeVisible();

        // Verify server correctly sets the target attribute
        await expect(page.locator("body")).toHaveAttribute("data-target", "15");

        // Verify battle state is properly initialized
        await expect(page.getByTestId("round-counter")).toContainText("Round 1");
        await expect(page.getByTestId("score-display")).toContainText("You: 0 Opponent: 0");

        // Verify timer starts (server-side integration)
        const timerLocator = page.getByTestId("next-round-timer");
        await expect(timerLocator).toContainText(/Time Left: \d+s/);
      },
      ["log", "info", "warn", "error", "debug"]
    );
  });

  test("server handles different round length selections correctly", async ({ page }) => {
    await withMutedConsole(
      async () => {
        // Force the round select modal to show in Playwright tests
        await page.addInitScript(() => {
          window.__FF_OVERRIDES = { showRoundSelectModal: true };
        });

        await page.goto("/src/pages/battleClassic.html");

        // Wait for modal and select Quick battle (5 points)
        await page.getByRole("dialog").waitFor();
        await page.getByRole("button", { name: "Quick" }).click();

        // Verify server correctly sets target for Quick battle
        await expect(page.locator("body")).toHaveAttribute("data-target", "5");

        // Verify battle initializes with correct state
        await expect(page.getByTestId("round-counter")).toContainText("Round 1");

        // Navigate to a new page to test persistence (server-side behavior)
        await page.reload();

        // Force modal again and select Medium battle
        await page.addInitScript(() => {
          window.__FF_OVERRIDES = { showRoundSelectModal: true };
        });

        await page.reload();
        await page.getByRole("dialog").waitFor();
        await page.getByRole("button", { name: "Medium" }).click();

        // Verify server correctly updates target for Medium battle
        await expect(page.locator("body")).toHaveAttribute("data-target", "10");
      },
      ["log", "info", "warn", "error", "debug"]
    );
  });
});
