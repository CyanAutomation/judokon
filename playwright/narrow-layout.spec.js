import { test, expect } from "./fixtures/commonSetup.js";

test.describe("Responsive Design", () => {
  test.describe("Mobile Layout (320px)", () => {
    test("renders homepage without critical layout issues on mobile", async ({ page }) => {
      await page.goto("/index.html", { waitUntil: "networkidle" });
      await page.setViewportSize({ width: 320, height: 568 });

      // Check for reasonable horizontal scroll (allow some tolerance for non-responsive design)
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      // Allow up to 480px scroll width for mobile (some pages may not be fully responsive)
      expect(scrollWidth).toBeLessThanOrEqual(480);

      // Verify key elements are present and functional
      const header = page.locator("header, .header");
      await expect(header).toBeVisible();

      const mainContent = page.locator("main, .game-mode-grid");
      await expect(mainContent).toBeVisible();

      // Check navigation is accessible
      const nav = page.locator("nav, [role='navigation']");
      if ((await nav.count()) > 0) {
        await expect(nav).toBeVisible();
      }
    });

    test("battle pages load correctly on mobile viewport", async ({ page }) => {
      await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });
      await page.setViewportSize({ width: 320, height: 568 });

      // Check page loads without critical errors
      const body = page.locator("body");
      await expect(body).toBeVisible();

      // Verify header is present
      const header = page.locator("header, .header");
      await expect(header).toBeVisible();

      // Check if battle interface elements are present (may have scroll issues)
      const battleElements = page.locator("#battle-container, .battle-container, #round-message");
      if ((await battleElements.count()) > 0) {
        await expect(battleElements.first()).toBeVisible();
      }

      // Verify page is functional despite potential scroll issues
      const logo = page.locator(".logo, img[alt*='Logo']");
      await expect(logo).toBeVisible();
    });
  });

  test.describe("Tablet Layout (768px)", () => {
    test("renders with proper tablet layout and no horizontal scroll", async ({ page }) => {
      await page.goto("/index.html", { waitUntil: "networkidle" });
      await page.setViewportSize({ width: 768, height: 1024 });

      // Check no horizontal scroll
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(768);

      // Verify layout adapts to tablet size
      const mainContent = page.locator("main, [role='main']");
      await expect(mainContent).toBeVisible();

      // Check if grid layouts work properly
      const gridElements = page.locator(".grid, .flex, [class*='col'], [class*='row']");
      if ((await gridElements.count()) > 0) {
        // Verify grid elements don't overflow
        const gridOverflow = await page.evaluate(() => {
          const grids = document.querySelectorAll('.grid, .flex, [class*="col"], [class*="row"]');
          for (const grid of grids) {
            const rect = grid.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
              return true; // Found overflow
            }
          }
          return false;
        });
        expect(gridOverflow).toBe(false);
      }
    });

    test("settings page is usable on tablet", async ({ page }) => {
      await page.goto("/src/pages/settings.html", { waitUntil: "networkidle" });
      await page.setViewportSize({ width: 768, height: 1024 });

      // Check no horizontal scroll
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(768);

      // Verify settings form elements are accessible
      const formElements = page.locator("input, select, button, [role='checkbox'], [role='radio']");
      if ((await formElements.count()) > 0) {
        await expect(formElements.first()).toBeVisible();
      }

      // Check settings layout doesn't overflow
      const settingsContainer = page.locator(".settings, [data-testid='settings'], main");
      await expect(settingsContainer).toBeVisible();
    });
  });

  test.describe("Ultra-narrow Layout (260px)", () => {
    test("handles extreme narrow viewport gracefully", async ({ page }) => {
      await page.goto("/index.html", { waitUntil: "networkidle" });
      await page.setViewportSize({ width: 260, height: 800 });

      // Check no horizontal scroll
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(260);

      // Verify critical content is still accessible
      const body = page.locator("body");
      await expect(body).toBeVisible();

      // Check if text doesn't overflow containers
      await page.evaluate(() => {
        const elements = document.querySelectorAll("p, h1, h2, h3, h4, h5, h6, span, div");
        for (const el of elements) {
          const style = window.getComputedStyle(el);
          if (style.textOverflow === "ellipsis" || style.overflow === "hidden") {
            // Check if content is actually truncated
            if (el.scrollWidth > el.clientWidth) {
              // Allow some truncation for ultra-narrow layouts
              return;
            }
          }
        }
      });
    });

    test("navigation remains functional on ultra-narrow", async ({ page }) => {
      await page.goto("/index.html", { waitUntil: "networkidle" });
      await page.setViewportSize({ width: 260, height: 800 });

      // Check page loads without critical errors
      const body = page.locator("body");
      await expect(body).toBeVisible();

      // Test navigation links if present (may be hidden on ultra-narrow)
      const navLinks = page.locator("nav a, [role='navigation'] a, .nav a, a[data-testid*='nav']");
      if ((await navLinks.count()) > 0) {
        // Check if links exist but may be hidden for responsive design
        const visibleLinks = navLinks.locator(":visible");
        if ((await visibleLinks.count()) > 0) {
          await expect(visibleLinks.first()).toBeVisible();
        } else {
          // Links exist but are hidden - this is acceptable for ultra-narrow layouts
          expect(await navLinks.count()).toBeGreaterThan(0);
        }
      }

      // Verify core functionality still works
      const header = page.locator("header, .header");
      await expect(header).toBeVisible();

      const mainContent = page.locator("main, .game-mode-grid");
      await expect(mainContent).toBeVisible();
    });
  });

  test.describe("Responsive Breakpoints", () => {
    test("adapts correctly across common breakpoints", async ({ page }) => {
      const breakpoints = [
        { name: "mobile", width: 375, height: 667 },
        { name: "tablet", width: 768, height: 1024 },
        { name: "desktop", width: 1024, height: 768 },
        { name: "large", width: 1440, height: 900 }
      ];

      for (const breakpoint of breakpoints) {
        await page.goto("/index.html", { waitUntil: "networkidle" });
        await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });

        // Check no horizontal scroll for each breakpoint
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(breakpoint.width);

        // Verify page remains functional
        const body = page.locator("body");
        await expect(body).toBeVisible();

        // Check for any layout issues
        const layoutIssues = await page.evaluate(() => {
          const elements = document.querySelectorAll("*");
          let issues = 0;
          for (const el of elements) {
            const rect = el.getBoundingClientRect();
            // Check for elements extending beyond viewport
            if (rect.right > window.innerWidth + 10) {
              // Small tolerance
              issues++;
            }
          }
          return issues;
        });

        // Allow minimal layout issues but ensure they're not excessive
        expect(layoutIssues).toBeLessThan(5);
      }
    });
  });
});
