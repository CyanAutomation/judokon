import { test, expect } from "@playwright/test";
import { resolve } from "node:path";

test.describe("Classic Battle bootstrap", () => {
  test("scoreboard shows initial content", async ({ page }) => {
    const filePath = resolve(process.cwd(), "src/pages/battleClassic.html");
    await page.goto(`file://${filePath}`);

    await expect(page.locator("#score-display")).toContainText(/You:\s*0/);
    await expect(page.locator("#score-display")).toContainText(/Opponent:\s*0/);
    await expect(page.locator("#round-counter")).toHaveText(/Round\s*0/);
  });
});
