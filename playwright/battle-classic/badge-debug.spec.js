import { test, expect } from "@playwright/test";

test.describe("State badge and debug panel", () => {
  test("badge visible and debug panel present with flags", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { enableTestMode: true, battleStateBadge: true };
    });
    await page.goto("/src/pages/battleClassic.html");
    await expect(page.locator("#battle-state-badge")).toBeVisible();
    // Debug panel is rendered as <details id="debug-panel">
    const panel = page.locator("#debug-panel");
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute("open", /.*/);
  });
});
