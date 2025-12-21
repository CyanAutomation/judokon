import { test, expect } from "./fixtures/commonSetup.js";

const viewports = [
  { name: "desktop", viewport: { width: 1920, height: 1080 } },
  { name: "mobile", viewport: { width: 430, height: 900 } }
];

async function captureHomeLayout(page) {
  const grid = page.locator("main.game-mode-grid");
  await expect(grid).toBeVisible();

  const tiles = grid.locator(".card");
  const viewport = page.viewportSize();
  if (!viewport) {
    throw new Error("Viewport size is not available");
  }

  const columns = await grid.evaluate((node) => {
    const template = getComputedStyle(node).gridTemplateColumns;
    return template
      .split(" ")
      .filter(Boolean)
      .length;
  });

  const positions = [];
  const count = await tiles.count();
  for (let index = 0; index < count; index += 1) {
    const box = await tiles.nth(index).boundingBox();
    if (box) {
      positions.push(box);
    }
  }

  if (positions.length === 0) {
    throw new Error(`No visible tiles found for layout validation. Found ${count} tiles but none had valid bounding boxes.`);
  }

  const maxRight = Math.max(...positions.map((box) => box.x + box.width));
  const maxBottom = Math.max(...positions.map((box) => box.y + box.height));

  expect(maxRight).toBeLessThanOrEqual(viewport.width + 2);
  expect(maxBottom).toBeLessThan(viewport.height * 3);

  return { columns, count, positions };
}

async function gotoHome(page) {
  await page.goto("/index.html");
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("main.game-mode-grid")).toBeVisible();
}

async function ensureMeaningfulFocus(page, locator) {
  await expect(locator).toBeVisible();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const hasFocus = await locator.evaluate((node) => node === document.activeElement);
    if (hasFocus) {
      return;
    }
    await locator.focus();
    await page.waitForTimeout(100);
  }

  await expect(locator).toBeFocused();
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
        await expect(
          classicTile.getByRole("heading", { level: 2, name: /classic battle/i })
        ).toBeVisible();
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
          const focusedElement = page.getByRole("link", { name: namePattern });
          await focusedElement.waitFor({ state: "visible" });
          await expect(focusedElement).toBeFocused();
        }
      });

      test("activates tiles via keyboard", async ({ page }) => {
        // Test a representative subset to balance coverage and performance
        const destinations = [
          {
            name: /start classic battle mode/i,
            url: /\/src\/pages\/battleClassic\.html$/,
            ready: async () => {
              const statButtons = page.getByTestId("stat-buttons");
              await expect(statButtons).toHaveAttribute("data-buttons-ready", "true");
              await expect(statButtons.getByRole("group", { name: /choose a stat/i })).toBeVisible();
              await ensureMeaningfulFocus(page, page.getByTestId("stat-button").first());
            }
          },
          {
            name: /view a random judoka/i,
            url: /\/src\/pages\/randomJudoka\.html$/,
            ready: async () => {
              await page.locator('body[data-random-judoka-ready="true"]').waitFor();
              const drawButton = page.getByRole("button", { name: /draw a random judoka card/i });
              await ensureMeaningfulFocus(page, drawButton);
              await expect(page.getByTestId("card-container")).toBeVisible();
            }
          },
          {
            name: /open settings/i,
            url: /\/src\/pages\/settings\.html$/,
            ready: async () => {
              await expect(page.getByRole("heading", { name: /settings/i })).toBeVisible();
              const displayModeLight = page.locator("#display-mode-light");
              await ensureMeaningfulFocus(page, displayModeLight);
              await expect(page.getByRole("main")).toContainText(/display mode/i);
            }
          }
        ];

        for (const destination of destinations) {
          await page.getByRole("link", { name: destination.name }).focus();
          await page.keyboard.press("Enter");

          await expect(page).toHaveURL(destination.url);
          await destination.ready();

          await page.goBack();
          await gotoHome(page);
        }
      });

      test("honors tooltip overlay feature flag on tiles", async ({ page }) => {
        await page.addInitScript(() => {
          if (!window.__FF_OVERRIDES) {
            window.__FF_OVERRIDES = {};
          }
          window.__FF_OVERRIDES.tooltipOverlayDebug = true;
        });

        await gotoHome(page);

        const body = page.locator("body");
        await expect(body).toHaveClass(/tooltip-overlay-debug/);
        await expect(body).toHaveAttribute("data-feature-tooltip-overlay-debug", "enabled");
        await expect(page.getByRole("link", { name: /start classic battle mode/i })).toBeVisible();
      });

      test("adapts tile layout to the viewport", async ({ page }) => {
        await captureHomeLayout(page);
      });

      test("preserves viewport layout after navigating away and back", async ({ page }) => {
        const initialLayout = await captureHomeLayout(page);

        const classicTile = page.getByRole("link", { name: /start classic battle mode/i });
        await classicTile.focus();
        await page.keyboard.press("Enter");

        await expect(page).toHaveURL(/\/src\/pages\/battleClassic\.html$/);
        await page.goBack();
        await gotoHome(page);

        const restoredLayout = await captureHomeLayout(page);
        expect(restoredLayout.columns).toBe(initialLayout.columns);
        expect(restoredLayout.count).toBe(initialLayout.count);
      });
    });
  }
});
