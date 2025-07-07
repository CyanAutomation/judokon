import { test, expect } from "@playwright/test";
import { registerCommonRoutes } from "./fixtures/commonRoutes.js";

test.describe("View Judoka screen", () => {
  test.beforeEach(async ({ page }) => {
    await registerCommonRoutes(page);
    await page.goto("/src/pages/randomJudoka.html");
  });

  test("essential elements visible", async ({ page }) => {
    await page.getByRole("button", { name: /draw card/i }).waitFor();
    await expect(page.getByRole("button", { name: /draw card/i })).toBeVisible();
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
    const btn = page.getByRole("button", { name: /draw card/i });
    await btn.waitFor();
    await expect(btn).toHaveText(/draw card/i);

    await page.evaluate(() => {
      const button = document.querySelector("#draw-card-btn");
      button.textContent = "Pick a random judoka";
    });

    await expect(page.getByRole("button", { name: /pick a random judoka/i })).toBeVisible();
  });

  test("draw card populates container", async ({ page }) => {
    await page.click("#draw-card-btn");
    const card = page.locator("#card-container .judoka-card");
    await expect(card).toHaveCount(1);
    await expect(card).toBeVisible();
    const flag = card.locator(".card-top-bar img");
    await expect(flag).toHaveAttribute("alt", /(Portugal|USA|Japan) flag/i);
  });
});
