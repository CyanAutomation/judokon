import { test, expect } from "@playwright/test";
import { registerCommonRoutes } from "./fixtures/commonRoutes.js";

test.describe("View Judoka screen", () => {
  test.beforeEach(async ({ page }) => {
    await registerCommonRoutes(page);
    await page.goto("/src/pages/randomJudoka.html");
  });

  test("essential elements visible", async ({ page }) => {
    await page.getByTestId("draw-button").waitFor();
    await expect(page.getByTestId("draw-button")).toBeVisible();
    await expect(page.getByRole("navigation")).toBeVisible();
  });

  test("battle link navigates", async ({ page }) => {
    const battleLink = page.getByRole("link", { name: /classic battle/i });
    await battleLink.waitFor();
    await battleLink.click();
    await expect(page).toHaveURL(/battleJudoka\.html/);
  });

  test("logo has alt text", async ({ page }) => {
    const logo = page.getByRole("img", { name: "JU-DO-KON! Logo" });
    await expect(logo).toHaveAttribute("alt", "JU-DO-KON! Logo");
  });

  test("draw button accessible name updates", async ({ page }) => {
    const btn = page.getByTestId("draw-button");
    await btn.waitFor();
    await expect(btn).toHaveText(/draw card/i);

    await page.evaluate(() => {
      const button = document.querySelector('[data-testid="draw-button"]');
      button.textContent = "Pick a random judoka";
    });

    await expect(page.getByRole("button", { name: /pick a random judoka/i })).toBeVisible();
  });

  test("draw card populates container", async ({ page }) => {
    await page.getByTestId("draw-button").click();
    const card = page.getByTestId("card-container").locator(".judoka-card");
    await expect(card).toHaveCount(1);
    await expect(card).toBeVisible();
    const flag = card.locator(".card-top-bar img");
    await expect(flag).toHaveAttribute("alt", /(Portugal|USA|Japan) flag/i);
  });

  test("draw button uses design tokens", async ({ page }) => {
    const btn = page.getByTestId("draw-button");
    await btn.waitFor();
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
});
