import { test, expect } from "@playwright/test";

test.describe("View Judoka screen", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/src/pages/randomJudoka.html");
  });

  test("essential elements visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: /draw card/i })).toBeVisible();
    await expect(page.getByRole("navigation")).toBeVisible();
  });

  test("battle link navigates", async ({ page }) => {
    await page.getByRole("link", { name: /battle!/i }).click();
    await expect(page).toHaveURL(/battleJudoka\.html/);
  });

  test("logo has alt text", async ({ page }) => {
    const logo = page.getByRole("img", { name: "JU-DO-KON! Logo" });
    await expect(logo).toHaveAttribute("alt", "JU-DO-KON! Logo");
  });

  test("draw button has label", async ({ page }) => {
    const btn = page.getByRole("button", { name: /draw card/i });
    await expect(btn).toHaveAttribute("aria-label", /draw a random card/i);
  });

  test("draw card populates container", async ({ page }) => {
    await page.click("#draw-card-btn");
    const card = page.locator("#card-container .judoka-card");
    await expect(card).toBeVisible();
  });
});
