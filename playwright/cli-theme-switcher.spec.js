import { test, expect } from "@playwright/test";

test.describe("CLI Theme Switcher", () => {
  test("should toggle immersive theme", async ({ page }) => {
    await page.goto("/src/pages/battleCLI.html");

    const immersiveCheckbox = page.locator("#immersive-toggle");
    const body = page.locator("body");

    // Initially, the theme should be off
    await expect(body).not.toHaveClass(/cli-immersive/);
    await expect(immersiveCheckbox).not.toBeChecked();

    // Turn on immersive theme
    await immersiveCheckbox.check();
    await expect(body).toHaveClass(/cli-immersive/);
    await expect(immersiveCheckbox).toBeChecked();

    // Turn off immersive theme
    await immersiveCheckbox.uncheck();
    await expect(body).not.toHaveClass(/cli-immersive/);
    await expect(immersiveCheckbox).not.toBeChecked();
  });
});
