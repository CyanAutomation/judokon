import { test, expect } from "./fixtures/commonSetup.js";
import { verifyPageBasics, NAV_CLASSIC_BATTLE } from "./fixtures/navigationChecks.js";

test.describe("View Judoka screen", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/src/pages/randomJudoka.html");
    await page.locator('body[data-random-judoka-ready="true"]').waitFor();
    await verifyPageBasics(page, [NAV_CLASSIC_BATTLE]);
  });

  test("random judoka elements visible", async ({ page }) => {
    await expect(page.getByTestId("draw-button")).toBeVisible();
  });

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
  });

  test("draw card populates container", async ({ page }) => {
    await page.getByTestId("draw-button").click();
    const card = page.getByTestId("card-container").locator(".judoka-card");
    await expect(card).toHaveCount(1);
    await expect(card).toBeVisible();
    const flag = card.locator(".card-top-bar img");
    await expect(flag).toHaveAttribute("alt", /(Portugal|USA|Japan) flag/i);
  });

  test("draw button shows loading state", async ({ page }) => {
    const btn = page.getByTestId("draw-button");
    await btn.click();
    await expect(btn).toHaveText(/drawing/i);
    await expect(btn).toHaveAttribute("aria-busy", "true");
    await expect(btn).toHaveText(/draw card/i);
    await expect(btn).not.toHaveAttribute("aria-busy");
  });

  test("portrait and landscape layouts", async ({ page }) => {
    const section = page.locator(".card-section");
    const controls = page.locator(".draw-controls");

    // Portrait
    await page.setViewportSize({ width: 600, height: 900 });
    let flexDir = await section.evaluate((el) => getComputedStyle(el).flexDirection);
    let marginTop = await controls.evaluate((el) => getComputedStyle(el).marginTop);
    expect(flexDir).toBe("column");
    expect(marginTop).toBe("24px");

    // Landscape
    await page.setViewportSize({ width: 900, height: 600 });
    flexDir = await section.evaluate((el) => getComputedStyle(el).flexDirection);
    marginTop = await controls.evaluate((el) => getComputedStyle(el).marginTop);
    expect(flexDir).toBe("row");
    expect(marginTop).toBe("0px");
  });

  test("draw button remains within viewport", async ({ page }) => {
    const btn = page.getByTestId("draw-button");
    const { bottom, innerHeight } = await btn.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return { bottom: rect.bottom, innerHeight: window.innerHeight };
    });
    const ALLOWED_OFFSET = 10;
    expect(bottom).toBeLessThanOrEqual(innerHeight + ALLOWED_OFFSET);
  });
});
