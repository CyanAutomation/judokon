import { test, expect } from "@playwright/test";
import { resolve } from "node:path";

test.describe("Classic Battle page scaffold", () => {
  test("loads without console errors and has scoreboard nodes", async ({ page }) => {
    const errors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    const filePath = resolve(process.cwd(), "src/pages/battleClassic.html");
    await page.goto(`file://${filePath}`);

    await expect(page.locator("header #round-message")).toBeVisible();
    await expect(page.locator("header #next-round-timer")).toBeVisible();
    await expect(page.locator("header #round-counter")).toBeVisible();
    await expect(page.locator("header #score-display")).toBeVisible();

    expect(errors, `Console errors detected: ${errors.join("\n")}`).toHaveLength(0);
  });
});
