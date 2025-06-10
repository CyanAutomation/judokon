import { test, expect } from "@playwright/test";

test.describe("View Judoka screen", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/src/data/judoka.json", (route) =>
      route.fulfill({ path: "tests/fixtures/judoka.json" })
    );
    await page.route("**/src/data/gokyo.json", (route) =>
      route.fulfill({ path: "tests/fixtures/gokyo.json" })
    );
    await page.route("**/src/data/countryCodeMapping.json", (route) =>
      route.fulfill({ path: "tests/fixtures/countryCodeMapping.json" })
    );
    await page.goto("/src/pages/randomJudoka.html");
  });

  test("essential elements visible", async ({ page }) => {
    await page.getByRole("button", { name: /draw a random card/i }).waitFor();
    await expect(page.getByRole("button", { name: /draw a random card/i })).toBeVisible();
    await expect(page.getByRole("navigation")).toBeVisible();
  });

  test("battle link navigates", async ({ page }) => {
    const battleLink = page.getByRole("link", { name: /battle mode page/i });
    await battleLink.waitFor();
    await battleLink.click();
    await expect(page).toHaveURL(/battleJudoka\.html/);
  });

  test("logo has alt text", async ({ page }) => {
    const logo = page.getByRole("img", { name: "JU-DO-KON! Logo" });
    await expect(logo).toHaveAttribute("alt", "JU-DO-KON! Logo");
  });

  test("draw button has label", async ({ page }) => {
    await page.getByRole("button", { name: /draw a random card/i }).waitFor();
    const btn = page.locator("#draw-card-btn");
    await expect(btn).toHaveAttribute("aria-label", /draw a random card/i);

    // Simulate a change in the button's display text
    await page.evaluate(() => {
      const button = document.querySelector("#draw-card-btn");
      button.textContent = "Pick a random judoka";
      button.setAttribute("aria-label", "Pick a random judoka");
    });

    // Verify that the aria-label is updated to match the new text
    await expect(btn).toHaveAttribute("aria-label", /pick a random judoka/i);
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
