import { test, expect } from "./fixtures/commonSetup.js";
import { verifyPageBasics } from "./fixtures/navigationChecks.js";

test.describe("Update Judoka page", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/src/data/gameModes.json", (route) =>
      route.fulfill({ path: "tests/fixtures/gameModes.json" })
    );
    await page.goto("/src/pages/updateJudoka.html");
  });

  test("page loads", async ({ page }) => {
    await verifyPageBasics(page, ["nav-randomJudoka", "nav-updateJudoka", "nav-classicBattle"]);
  });

  test("navigation links work", async ({ page }) => {
    await page.getByTestId("nav-randomJudoka").click();
    await expect(page).toHaveURL(/randomJudoka\.html/);
    // Wait for bottom navigation links to populate
    await page.getByTestId("nav-updateJudoka").waitFor();
    await page.goBack({ waitUntil: "load" });

    await page.getByTestId("nav-updateJudoka").click();
    await expect(page).toHaveURL(/updateJudoka\.html/);

    const battleLink = page.getByTestId("nav-classicBattle");
    await battleLink.waitFor();
    await expect(battleLink).toHaveCount(1);
  });
});
