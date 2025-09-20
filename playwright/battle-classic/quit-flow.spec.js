import { test, expect } from "@playwright/test";
import { withMutedConsole } from "../../tests/utils/console.js";

test.describe("Classic Battle quit flow", () => {
  test("Quit opens confirmation modal", async ({ page }) => {
    await withMutedConsole(async () => {
      await page.goto("/src/pages/battleClassic.html");
      await page.click("#quit-button");
      await expect(page.locator("#confirm-quit-button")).toBeVisible();
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
