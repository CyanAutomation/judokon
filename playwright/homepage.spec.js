import { test, expect } from "./fixtures/commonSetup.js";
import { hex } from "wcag-contrast";

test.describe("Homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/index.html");
  });

  test("homepage loads", async ({ page }) => {
    await expect(page).toHaveTitle(/JU-DO-KON!/);
  });

  test("hero landmark exposes JU-DO-KON! brand heading", async ({ page }) => {
    const hero = page.getByRole("main");

    await expect(hero).toBeVisible();
    await expect(hero.getByRole("heading", { level: 1, name: "JU-DO-KON!" })).toBeVisible();
    await expect(hero.getByRole("heading", { level: 1, name: "JU-DO-KON!" })).toHaveText(
      "JU-DO-KON!"
    );
  });

  test("primary classic battle CTA is advertised and points to battle page", async ({ page }) => {
    const primaryCta = page.getByRole("link", { name: "Start classic battle mode" });
    await expect(primaryCta).toBeVisible();
    await expect(primaryCta).toHaveAttribute("href", "./src/pages/battleClassic.html");
  });

  test("selecting the classic battle tile navigates into classic battle experience", async ({
    page
  }) => {
    await page.getByRole("link", { name: "Start classic battle mode" }).click();

    await expect(page).toHaveURL(/\/src\/pages\/battleClassic\.html$/);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("group", { name: "Choose a stat" })).toBeVisible();
  });

  test("keyboard navigation focuses tiles", async ({ page }) => {
    const expectedTiles = [
      { name: "Start classic battle mode", href: "./src/pages/battleClassic.html" },
      { name: "Start classic battle (CLI)", href: "./src/pages/battleCLI.html" },
      { name: "View a random judoka", href: "./src/pages/randomJudoka.html" },
      { name: "Open meditation screen", href: "./src/pages/meditation.html" },
      { name: "Browse Judoka", href: "./src/pages/browseJudoka.html" },
      { name: "Open settings", href: "./src/pages/settings.html" }
    ];

    // The grid only contains these six anchor tiles in DOM order, so tabbing from the top of the
    // page should move focus through them sequentially without interruption.
    
    // Ensure we start from a known focus state
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: expectedTiles[0].name })).toBeFocused();

    for (const [index, tileMeta] of expectedTiles.entries()) {
      const tile = page.getByRole("link", { name: tileMeta.name });

      await expect(tile).toHaveAttribute("href", tileMeta.href);
      await expect(tile).toHaveAccessibleName(tileMeta.name);
      await expect(tile).toBeFocused();

      // Keep advancing focus so that the next assertion verifies the following tile in the grid
      // receives focus in order.
      if (index < expectedTiles.length - 1) {
        await page.keyboard.press("Tab");
        // Wait for focus to settle before next iteration
        await expect(page.getByRole("link", { name: expectedTiles[index + 1].name })).toBeFocused();
      }
    }

    // Shift-tabbing confirms focus can be returned to the previous tile after forward navigation.
    await page.keyboard.press("Shift+Tab");
    await expect(page.getByRole("link", { name: expectedTiles[expectedTiles.length - 2].name })).toBeFocused();
  });

  test("fallback icon applied on load failure", async ({ page }) => {
    await page.goto("/playwright/fixtures/svg-fallback.html");

    const icon = page.getByTestId("broken-icon");
    await expect(icon).toBeVisible();
    await expect.poll(() => icon.getAttribute("src")).toContain("judokonLogoSmall.png");
    await expect(icon).toHaveClass(/svg-fallback/);
  });

  test("tiles meet WCAG AA contrast targets", async ({ page }) => {
    const toHex = (color, fallbackHex) => {
      if (!color || color === "transparent" || color === "rgba(0, 0, 0, 0)") {
        return fallbackHex;
      }

      if (color.startsWith("#")) return color;

      const parts = color.match(/\d+(?:\.\d+)?/g);
      if (!parts || parts.length < 3) return fallbackHex;

      const [r, g, b] = parts.map((part) => Math.round(Math.max(0, Math.min(255, parseFloat(part)))));
      return `#${[r, g, b]
        .map((component) => component.toString(16).padStart(2, "0"))
        .join("")}`;
    };

    const tiles = page.locator(".card");
    const tileCount = await tiles.count();
    expect(tileCount).toBeGreaterThan(0);

    const pageBgColor = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const pageBgHex = toHex(pageBgColor, "#000000");

    const states = [
      { label: "default", apply: async () => {} },
      {
        label: "hovered",
        apply: async (tile) => {
          await tile.hover();
        },
        cleanup: async (pageRef) => {
          await pageRef.mouse.move(0, 0);
        }
      },
      {
        label: "focused",
        apply: async (tile) => {
          await tile.focus();
        },
        cleanup: async (pageRef) => {
          await pageRef.evaluate(() => document.activeElement?.blur());
        }
      }
    ];

    for (let index = 0; index < tileCount; index += 1) {
      const tile = tiles.nth(index);
      const name = (await tile.getAttribute("aria-label")) ?? `Tile ${index + 1}`;

      for (const state of states) {
        await state.apply(tile);

        const { fg, bg } = await tile.evaluate((node, fallback) => {
          const cs = getComputedStyle(node);
          return {
            fg: cs.color,
            bg: cs.backgroundColor === "rgba(0, 0, 0, 0)" ? fallback : cs.backgroundColor
          };
        }, pageBgColor);

        let ratio;
        try {
          ratio = hex(toHex(bg, pageBgHex), toHex(fg, "#000000"));
        } catch (error) {
          throw new Error(`Failed to calculate contrast ratio for "${name}" ${state.label}: ${error.message}. Background: ${bg}, Foreground: ${fg}`);
        }

        const failureMessage = `"${name}" ${state.label} contrast ${ratio.toFixed(
          2
        )}:1 fell below WCAG AA minimum of 4.5:1`;

        expect(ratio, failureMessage).toBeGreaterThanOrEqual(4.5);

        if (state.cleanup) {
          await state.cleanup(page);
        }
      }
    }
  });
});
