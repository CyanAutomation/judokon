import { test, expect } from "./fixtures/commonSetup.js";

const viewports = [
  { name: "desktop", viewport: { width: 1920, height: 1080 } },
  { name: "mobile", viewport: { width: 430, height: 900 } }
];

async function gotoHome(page) {
  await page.goto("/index.html");
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("main.game-mode-grid")).toBeVisible();
}

test.describe("Homepage layout", () => {
  for (const { name, viewport } of viewports) {
    test.describe(name, () => {
      test.use({ viewport });

      test.beforeEach(async ({ page }) => {
        await gotoHome(page);
      });

      test("shows hero copy and CTA text", async ({ page }) => {
        const banner = page.getByRole("banner");
        await expect(banner.getByRole("img", { name: /ju-do-kon! logo/i })).toBeVisible();
        await expect(page.getByRole("heading", { level: 1, name: /ju-do-kon!/i })).toBeAttached();

        const classicTile = page.getByRole("link", { name: /start classic battle mode/i });
        await expect(classicTile).toBeVisible();
        await expect(classicTile.getByRole("heading", { level: 2, name: /classic battle/i })).toBeVisible();
      });

      test("supports launching core actions", async ({ page }) => {
        const classicTile = page.getByRole("link", { name: /start classic battle mode/i });
        await classicTile.focus();
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(/\/src\/pages\/battleClassic\.html$/);
        await expect(page.getByRole("banner")).toBeVisible();

        await page.goBack();
        await gotoHome(page);

        const randomTile = page.getByRole("link", { name: /view a random judoka/i });
        await randomTile.focus();
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(/\/src\/pages\/randomJudoka\.html$/);
      });

      test("exposes accessible landmarks and focus order", async ({ page }) => {
        await expect(page.getByRole("banner")).toBeVisible();
        await expect(page.getByRole("main")).toBeVisible();
        await expect(page.getByRole("status")).toBeAttached();

        const expectedOrder = [
          /start classic battle mode/i,
          /start classic battle \(cli\)/i,
          /view a random judoka/i,
          /open meditation screen/i,
          /browse judoka/i,
          /open settings/i
        ];

        for (const namePattern of expectedOrder) {
          await page.keyboard.press("Tab");
          await expect(page.getByRole("link", { name: namePattern })).toBeFocused();
        }
      });

      test("activates tiles via keyboard", async ({ page }) => {
        await page.keyboard.press("Tab");
        await expect(page.getByRole("link", { name: /start classic battle mode/i })).toBeFocused();

        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(/\/src\/pages\/battleClassic\.html$/);
      });

      test("honors tooltip overlay feature flag on tiles", async ({ page }) => {
        await page.addInitScript(() => {
          window.__FF_OVERRIDES = { tooltipOverlayDebug: true };
        });

        await gotoHome(page);

        const body = page.locator("body");
        await expect(body).toHaveClass(/tooltip-overlay-debug/);
        await expect(body).toHaveAttribute("data-feature-tooltip-overlay-debug", "enabled");
        await expect(page.getByRole("link", { name: /start classic battle mode/i })).toBeVisible();
      });

      test("adapts tile layout to the viewport", async ({ page }) => {
        const grid = page.locator("main.game-mode-grid");
        await expect(grid).toBeVisible();

        const tiles = page.locator(".card");
        const viewportWidth = page.viewportSize()?.width ?? 0;
        const viewportHeight = page.viewportSize()?.height ?? 0;

        const positions = [];
        const count = await tiles.count();
        for (let index = 0; index < count; index += 1) {
          positions.push(await tiles.nth(index).boundingBox());
        }

        const maxRight = Math.max(...positions.map((box) => (box?.x ?? 0) + (box?.width ?? 0)));
        const maxBottom = Math.max(...positions.map((box) => (box?.y ?? 0) + (box?.height ?? 0)));

        expect(maxRight).toBeLessThanOrEqual(viewportWidth + 2);
        expect(maxBottom).toBeLessThan(viewportHeight * 3);
      });
    });
  }
});
