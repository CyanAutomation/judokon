import { test, expect } from "./fixtures/commonSetup.js";
import { hex } from "wcag-contrast";

const toHex = (color, fallbackHex) => {
  if (!color || color === "transparent" || color === "rgba(0, 0, 0, 0)") {
    return fallbackHex;
  }

  if (color.startsWith("#")) {
    // Validate hex format
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return fallbackHex;
    }
    return color;
  }

  const parts = color.match(/\d+(?:\.\d+)?/g);
  if (!parts || parts.length < 3) return fallbackHex;

  const [r, g, b] = parts.map((part) => Math.round(Math.max(0, Math.min(255, parseFloat(part)))));
  return `#${[r, g, b]
    .map((component) => component.toString(16).padStart(2, "0"))
    .join("")}`;
};

test.describe("Homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/index.html");
    await page.waitForLoadState("networkidle");
  });

  test("homepage load surfaces brand hero, CTA, and status areas", async ({ page }) => {
    const mainLandmark = page.getByRole("main", { name: "Game mode selection" });
    const heroHeading = page.getByRole("heading", { level: 1, name: "JU-DO-KON!" });
    const bannerImage = page.getByRole("img", { name: "JU-DO-KON! Logo" });
    const primaryCta = page.getByRole("link", { name: "Start classic battle mode" });
    const heroTileHeading = primaryCta.getByRole("heading", { level: 2, name: "Classic Battle" });
    const statusRegion = page.getByRole("status");

    await expect(page).toHaveTitle(/JU-DO-KON!/);
    await expect(mainLandmark).toBeVisible();
    await expect(mainLandmark).toHaveAttribute("aria-label", "Game mode selection");
    await expect(heroHeading).toBeVisible();
    await expect(bannerImage).toBeVisible();

    await expect(primaryCta).toBeVisible();
    await expect(primaryCta).toHaveAttribute("href", "./src/pages/battleClassic.html");
    await expect(primaryCta).not.toHaveAttribute("target", "_blank");
    await expect(heroTileHeading).toBeVisible();

    // Navigate to the primary CTA specifically rather than assuming tab order
    await primaryCta.focus();
    await expect(primaryCta).toBeFocused();

    await expect(statusRegion).toBeVisible();
    await expect(statusRegion).toHaveAttribute("aria-live", "polite");

    const headingOrder = await page.$$eval("h1, h2, h3", (nodes) =>
      nodes.map((node) => ({
        level: Number(node.tagName.replace("H", "")),
        text: node.textContent?.trim() || ""
      }))
    );

    expect(headingOrder[0]?.level).toBe(1);
    expect(
      headingOrder.every((heading, index, arr) => {
        if (index === 0) return true;
        const prevLevel = arr[index - 1].level;
        // Heading level can only increase by 1 or stay the same/decrease to any valid level
        return heading.level <= prevLevel + 1;
      })
    ).toBe(true);
  });

  test.describe("hero responsiveness", () => {
    const viewports = [
      { label: "desktop", size: { width: 1280, height: 720 } },
      { label: "mobile", size: { width: 390, height: 844 } }
    ];

    for (const viewport of viewports) {
      test(`hero maintains accessible heading and CTA on ${viewport.label}`, async ({ page }) => {
        await page.setViewportSize(viewport.size);
        await page.reload({ waitUntil: "networkidle" });

        const mainLandmark = page.getByRole("main", { name: "Game mode selection" });
        const heroHeading = page.getByRole("heading", { level: 1, name: "JU-DO-KON!" });
        const primaryCta = page.getByRole("link", { name: "Start classic battle mode" });

        await expect(mainLandmark).toBeVisible();
        await expect(heroHeading).toBeVisible();
        await expect(primaryCta).toBeVisible();

        const pageBgHex = toHex(
          await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
          "#000000"
        );
        const { fg, bg } = await primaryCta.evaluate((node, fallbackBg) => {
          const cs = getComputedStyle(node);
          return {
            fg: cs.color,
            bg:
              cs.backgroundColor === "rgba(0, 0, 0, 0)" || cs.backgroundColor === "transparent"
                ? fallbackBg
                : cs.backgroundColor
          };
        }, pageBgHex);

        const ctaContrast = hex(toHex(bg, pageBgHex), toHex(fg, "#000000"));
        expect(ctaContrast).toBeGreaterThanOrEqual(4.5);

        await expect(primaryCta).toHaveAttribute("href", "./src/pages/battleClassic.html");
      });
    }
  });

  test("hero landmark exposes JU-DO-KON! brand heading", async ({ page }) => {
    const hero = page.getByRole("main");

    await expect(hero).toBeVisible();
    await expect(hero.getByRole("heading", { level: 1, name: "JU-DO-KON!" })).toBeVisible();
    await expect(hero.getByRole("heading", { level: 1, name: "JU-DO-KON!" })).toHaveText(
      "JU-DO-KON!"
    );
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
    await expect(
      page.getByRole("link", { name: expectedTiles[expectedTiles.length - 2].name })
    ).toBeFocused();
  });

  test("fallback icon applied on load failure", async ({ page }) => {
    await page.route("/playwright/fixtures/missing-icon.svg", (route) => route.abort());
    await page.goto("/playwright/fixtures/svg-fallback.html");

    const icon = page.getByRole("img", { name: "Broken icon" });
    await expect(icon).toBeVisible();
    await expect(icon).toHaveAttribute("alt", "Broken icon");

    await expect.poll(async () => {
      const { naturalWidth, complete } = await icon.evaluate((img) => ({
        naturalWidth: img.naturalWidth,
        complete: img.complete
      }));

      return complete && naturalWidth > 0;
    }).toBe(true);
  });

  test("tiles meet WCAG AA contrast targets", async ({ page }) => {
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
            bg: cs.backgroundColor === "rgba(0, 0, 0, 0)" || cs.backgroundColor === "transparent" ? fallback : cs.backgroundColor
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
