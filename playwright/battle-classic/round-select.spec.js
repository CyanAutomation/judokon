import { test, expect } from "@playwright/test";
import { resolve } from "node:path";

test.describe("Classic Battle round select", () => {
  test("choosing 15 marks target", async ({ page }) => {
    const filePath = resolve(process.cwd(), "src/pages/battleClassic.html");
    await page.goto(`file://${filePath}`);

    // Wait for modal buttons and click the Long (id=3) option
    await page.locator("#round-select-3").click();

    // Expect body to mark selected target for testing
    await expect(page.locator("body")).toHaveAttribute("data-target", "15");
  });
});

