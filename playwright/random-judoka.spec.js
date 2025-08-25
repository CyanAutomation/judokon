import { test, expect } from "./fixtures/commonSetup.js";
import { verifyPageBasics, NAV_CLASSIC_BATTLE } from "./fixtures/navigationChecks.js";

test.describe.parallel("View Judoka screen", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/src/pages/randomJudoka.html");
    await page.locator('body[data-random-judoka-ready="true"]').waitFor();
  });

  test("random judoka elements visible", async ({ page }) => {
    await expect(page.getByTestId("draw-button")).toBeVisible();
    await verifyPageBasics(page, [NAV_CLASSIC_BATTLE]);
  });

  test("draw button accessible name constant", async ({ page }) => {
    const btn = page.getByTestId("draw-button");
    await expect(btn).toHaveText(/draw card/i);

    await page.evaluate(() => {
      const button = document.querySelector('[data-testid="draw-button"]');
      button.textContent = "Pick a random judoka";
    });

    await expect(page.getByRole("button", { name: /draw a random judoka card/i })).toBeVisible();
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

  test("draw button uses design tokens", async ({ page }) => {
    const btn = page.getByTestId("draw-button");
    const styles = await btn.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, color: cs.color };
    });
    const vars = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      return {
        bg: root.getPropertyValue("--button-bg").trim(),
        color: root.getPropertyValue("--button-text-color").trim()
      };
    });
    const hexToRgb = (hex) => {
      const h = hex.replace("#", "");
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      return `rgb(${r}, ${g}, ${b})`;
    };
    expect(styles.bg).toBe(hexToRgb(vars.bg));
    expect(styles.color).toBe(hexToRgb(vars.color));
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
