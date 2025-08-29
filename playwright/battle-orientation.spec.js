import { test, expect } from "./fixtures/commonSetup.js";
import { waitForBattleReady } from "./fixtures/waits.js";

test.describe("Battle orientation behavior", () => {
  test("updates orientation data attribute on rotation", async ({ page }) => {
    await page.goto("/src/pages/battleJudoka.html");
    await page.locator("#round-select-1").click();
    await waitForBattleReady(page);

    await page.setViewportSize({ width: 320, height: 480 });
    await page.evaluate(() => window.applyBattleOrientation());
    await expect(page.locator(".battle-header")).toHaveAttribute("data-orientation", "portrait");

    await page.setViewportSize({ width: 480, height: 320 });
    await page.evaluate(() => window.applyBattleOrientation());
    await expect(page.locator(".battle-header")).toHaveAttribute("data-orientation", "landscape");
  });

  test("truncates round message below 320px", async ({ page }) => {
    await page.goto("/src/pages/battleJudoka.html");
    await page.locator("#round-select-1").click();
    await waitForBattleReady(page);
    await page.setViewportSize({ width: 300, height: 600 });
    const msg = page.locator("#round-message");
    await msg.evaluate(
      (el) => (el.textContent = "A very long round message that should overflow on narrow screens")
    );
    const overflow = await msg.evaluate((el) => getComputedStyle(el).textOverflow);
    expect(overflow).toBe("ellipsis");
  });
});
