import { test, expect } from "./fixtures/commonSetup.js";
import { verifyPageBasics } from "./fixtures/navigationChecks.js";

test.describe("Create Judoka page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/src/pages/createJudoka.html");
  });

  test("page loads and nav visible", async ({ page }) => {
    await verifyPageBasics(page, ["nav-randomJudoka", "nav-classicBattle"]);
  });

  test("navigation links work", async ({ page }) => {
    await page.getByTestId("nav-randomJudoka").click();
    await expect(page).toHaveURL(/randomJudoka\.html/);
    await page.goBack({ waitUntil: "load" });
    await page.getByTestId("nav-classicBattle").click();
    await expect(page).toHaveURL(/battleJudoka\.html/);
  });
});
