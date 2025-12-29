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
  return `#${[r, g, b].map((component) => component.toString(16).padStart(2, "0")).join("")}`;
};

test.describe("Homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/index.html");
    // Wait only for DOM content, not all network activity
    await page.waitForLoadState("domcontentloaded");
    // Wait for the specific signal that homepage is ready
    await expect(page.locator("body")).toHaveAttribute("data-home-ready", "true", { timeout: 3000 });
  });

  test("hero CTA is actionable when home is ready", async ({ page }) => {
    const primaryCta = page.getByRole("link", { name: "Start classic battle mode" });

    // PRD §Homepage hero CTA readiness: CTA is ready when data-home-ready is true
    await expect(primaryCta).toBeVisible();
    await expect(primaryCta).toBeEnabled();
    await expect(primaryCta).toHaveAttribute("href", "./src/pages/battleClassic.html");
  });

  test("homepage load surfaces brand hero, CTA, and status areas", async ({ page }) => {
    const mainLandmark = page.getByRole("main", { name: "Game mode selection" });
    const heroHeading = page.getByRole("heading", { level: 1, name: "JU-DO-KON!" });
    const bannerImage = page.getByRole("img", { name: "JU-DO-KON! Logo" });
    const primaryCta = page.getByRole("link", { name: "Start classic battle mode" });
    const heroTileHeading = primaryCta.getByRole("heading", { level: 2, name: "Classic Battle" });
    const statusRegion = page.getByRole("status");

    // Check all visibility and attributes in parallel where possible
    await Promise.all([
      expect(page).toHaveTitle(/JU-DO-KON!/),
      expect(mainLandmark).toBeVisible(),
      expect(bannerImage).toBeVisible(),
      expect(primaryCta).toBeVisible(),
      expect(heroTileHeading).toBeVisible()
    ]);

    // Check attributes
    await expect(mainLandmark).toHaveAttribute("aria-label", "Game mode selection");
    await expect(primaryCta).toHaveAttribute("href", "./src/pages/battleClassic.html");
    
    // The h1 is sr-only (screen reader only) by design, so check it exists in the accessibility tree
    await expect(heroHeading).toBeAttached();
    
    // Status region exists in DOM and is accessible, but may be empty/hidden initially
    await expect(statusRegion).toBeAttached();
    await expect(statusRegion).toHaveAttribute("aria-live", "polite");

    // Verify heading hierarchy
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
        await page.reload({ waitUntil: "domcontentloaded" });
        await expect(page.locator("body")).toHaveAttribute("data-home-ready", "true", { timeout: 3000 });

        const mainLandmark = page.getByRole("main", { name: "Game mode selection" });
        const heroHeading = page.getByRole("heading", { level: 1, name: "JU-DO-KON!" });
        const primaryCta = page.getByRole("link", { name: "Start classic battle mode" });

        await Promise.all([
          expect(mainLandmark).toBeVisible(),
          expect(heroHeading).toBeAttached(),
          expect(primaryCta).toBeVisible()
        ]);

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
    const banner = page.getByRole("banner");
    // The h1 is in the header/banner, not in main
    const heading = page.getByRole("heading", { level: 1, name: "JU-DO-KON!" });
    const primaryCta = page.getByRole("link", { name: "Start classic battle mode" });

    // Check visibility in parallel
    await Promise.all([
      expect(banner).toBeVisible(),
      expect(hero).toBeVisible(),
      expect(primaryCta).toBeVisible()
    ]);

    // The h1 is sr-only (screen reader only) by design, so check it exists in the accessibility tree
    await expect(heading).toBeAttached();
    await expect(hero).toHaveAttribute("aria-label", "Game mode selection");
    await expect(heading).toHaveText("JU-DO-KON!");

    // Verify CTA position doesn't shift on focus
    const ctaBoxBefore = await primaryCta.boundingBox();
    await primaryCta.focus();
    const ctaBoxAfter = await primaryCta.boundingBox();

    expect(Math.abs((ctaBoxAfter?.x ?? 0) - (ctaBoxBefore?.x ?? 0))).toBeLessThanOrEqual(2);
    expect(Math.abs((ctaBoxAfter?.y ?? 0) - (ctaBoxBefore?.y ?? 0))).toBeLessThanOrEqual(2);
  });

  test("selecting the classic battle tile navigates into classic battle experience", async ({
    page
  }) => {
    await page.getByRole("link", { name: "Start classic battle mode" }).click();

    await page.waitForURL(/\/src\/pages\/battleClassic\.html$/);
    // Wait only for DOM content, not all network activity
    await page.waitForLoadState("domcontentloaded");
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

    // Start from known focus state
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: expectedTiles[0].name })).toBeFocused();

    for (const [index, tileMeta] of expectedTiles.entries()) {
      const tile = page.getByRole("link", { name: tileMeta.name });

      // Check attributes and focus in parallel
      await Promise.all([
        expect(tile).toHaveAttribute("href", tileMeta.href),
        expect(tile).toHaveAccessibleName(tileMeta.name),
        expect(tile).toBeFocused()
      ]);

      // Advance to next tile
      if (index < expectedTiles.length - 1) {
        await page.keyboard.press("Tab");
      }
    }

    // Verify reverse navigation
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

    await expect
      .poll(async () => {
        const { naturalWidth, complete } = await icon.evaluate((img) => ({
          naturalWidth: img.naturalWidth,
          complete: img.complete
        }));

        return complete && naturalWidth > 0;
      })
      .toBe(true);
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
            bg:
              cs.backgroundColor === "rgba(0, 0, 0, 0)" || cs.backgroundColor === "transparent"
                ? fallback
                : cs.backgroundColor
          };
        }, pageBgColor);

        let ratio;
        try {
          ratio = hex(toHex(bg, pageBgHex), toHex(fg, "#000000"));
        } catch (error) {
          throw new Error(
            `Failed to calculate contrast ratio for "${name}" ${state.label}: ${error.message}. Background: ${bg}, Foreground: ${fg}`
          );
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
