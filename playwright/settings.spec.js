import { test, expect } from "./fixtures/commonSetup.js";

test.describe("Settings page", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/src/data/gameModes.json", (route) =>
      route.fulfill({ path: "tests/fixtures/gameModes.json" })
    );
    await page.goto("/src/pages/settings.html", { waitUntil: "domcontentloaded" });
  });

  test("page loads", async ({ page }) => {
    await expect(page).toHaveTitle(/Ju-Do-Kon!/i);
  });

  test("mode toggle visible", async ({ page }) => {
    await page.getByLabel(/Classic Battle/i).waitFor();
    await expect(page.getByLabel(/Classic Battle/i)).toBeVisible();
  });

  test("essential elements visible", async ({ page }) => {
    await expect(page.getByRole("navigation")).toBeVisible();
    await expect(page.getByRole("img", { name: "JU-DO-KON! Logo" })).toBeVisible();
    await expect(page.getByLabel(/sound/i)).toBeVisible();
    await expect(page.getByLabel(/full navigation map/i)).toBeVisible();
    await expect(page.getByLabel(/motion effects/i)).toBeVisible();
    await expect(page.getByLabel(/display mode/i)).toBeVisible();
  });
});
