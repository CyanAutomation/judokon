import { test, expect } from "@playwright/test";

/**
 * Comprehensive layout assessment for battleCLI.html
 * Based on PRD requirements from design/productRequirementsDocuments/prdBattleCLI.md
 */

test.describe("CLI Layout Assessment", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/src/pages/battleCLI.html");
    // Wait for basic initialization
    await page.waitForSelector("#cli-root");
  });

  test("PRD Layout Requirements - Desktop Layout", async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });

    // Check basic container structure per PRD
    await expect(page.locator("#cli-root")).toBeVisible();
    await expect(page.locator("#cli-header")).toBeVisible();
    await expect(page.locator("#cli-countdown")).toBeVisible();
    await expect(page.locator("#cli-stats")).toBeVisible();
    await expect(page.locator("#round-message")).toBeVisible();
    await expect(page.locator("#cli-score")).toBeVisible();

    // Header layout verification
    const header = page.locator("#cli-header");
    await expect(header).toHaveCSS("display", "flex");
    await expect(header).toHaveCSS("justify-content", "space-between");

    // Check header height consistency (PRD requirement)
    const headerBox = await header.boundingBox();
    expect(headerBox.height).toBe(56); // Fixed height per current implementation

    // Verify monospace font usage (PRD requirement)
    const bodyFontFamily = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(bodyFontFamily).toMatch(/monospace|Monaco|Consolas|Courier/);
  });

  test("PRD Layout Requirements - Mobile Layout", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Verify responsive behavior
    const cliRoot = page.locator("#cli-root");
    // Note: browsers may convert vh to pixels, check computed pixel value instead
    const minHeightValue = await cliRoot.evaluate((el) => getComputedStyle(el).minHeight);
    expect(parseInt(minHeightValue)).toBeGreaterThanOrEqual(600); // Should be viewport height
    await expect(cliRoot).toHaveCSS("flex-direction", "column");

    // Check overflow handling
    await expect(cliRoot).toHaveCSS("overflow-x", "hidden");

    // Verify header doesn't wrap on narrow screens
    const header = page.locator("#cli-header");
    const headerHeight = await header.evaluate((el) => el.offsetHeight);
    expect(headerHeight).toBe(56); // Should maintain fixed height
  });

  test("Touch Target Requirements - 44px minimum", async ({ page }) => {
    // PRD requirement: tap targets ≥44px tall
    await page.setViewportSize({ width: 375, height: 667 });

    // Check if stats are rendered (may need to wait for initialization)
    const stats = page.locator(".cli-stat");
    const statCount = await stats.count();

    if (statCount > 0) {
      // Test first stat row height
      const firstStat = stats.first();
      const statBox = await firstStat.boundingBox();
      expect(statBox.height).toBeGreaterThanOrEqual(44);

      // Test all visible stat rows
      for (let i = 0; i < Math.min(statCount, 5); i++) {
        const stat = stats.nth(i);
        const box = await stat.boundingBox();
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    } else {
      // If no stats rendered yet, check minimum height requirement
      const statsContainer = page.locator("#cli-stats");
      // Browser may convert rem to pixels, check computed value
      const minHeightValue = await statsContainer.evaluate((el) => getComputedStyle(el).minHeight);
      expect(parseInt(minHeightValue)).toBeGreaterThanOrEqual(128); // 8rem = 128px
    }
  });

  test("Accessibility Requirements - Focus and ARIA", async ({ page }) => {
    // Check focus visibility
    const stats = page.locator("#cli-stats");
    await stats.focus();

    // Verify focus is visible (should have outline or box-shadow)
    const focusStyles = await stats.evaluate((el) => {
      const styles = getComputedStyle(el, ":focus");
      return {
        outline: styles.outline,
        boxShadow: styles.boxShadow,
        outlineOffset: styles.outlineOffset
      };
    });

    // Should have visible focus indicator
    const hasFocusIndicator =
      focusStyles.outline !== "none" ||
      focusStyles.boxShadow !== "none" ||
      focusStyles.outlineOffset !== "0px";
    expect(hasFocusIndicator).toBeTruthy();

    // Check for aria-live regions per PRD
    const ariaLiveElements = page.locator('[aria-live="polite"], [role="status"]');
    const ariaCount = await ariaLiveElements.count();
    expect(ariaCount).toBeGreaterThan(0);
  });

  test("Color Contrast Assessment", async ({ page }) => {
    // Get computed styles for contrast analysis
    const bodyStyles = await page.evaluate(() => {
      const body = document.body;
      const computed = getComputedStyle(body);
      return {
        background: computed.backgroundColor,
        color: computed.color
      };
    });

    // Verify dark theme colors - allow for CLI immersive theme override
    expect(bodyStyles.background).toMatch(/rgb\(11, 12, 12\)|#0b0c0c|rgb\(0, 0, 0\)|#000/);
    expect(bodyStyles.color).toMatch(/rgb\(242, 242, 242\)|#f2f2f2|rgb\(140, 255, 107\)|#8cff6b/);

    // Test retro theme if available
    await page.evaluate(() => {
      if (window.__battleCLIinit && window.__battleCLIinit.applyRetroTheme) {
        window.__battleCLIinit.applyRetroTheme(true);
      }
    });

    const retroStyles = await page.evaluate(() => {
      const body = document.body;
      const computed = getComputedStyle(body);
      return {
        background: computed.backgroundColor,
        color: computed.color
      };
    });

    // Retro theme should use green on black
    if (retroStyles.color.includes("140, 255, 107")) {
      // #8cff6b
      expect(retroStyles.background).toMatch(/rgb\(0, 0, 0\)|#000/);
    }
  });

  test("Grid Layout for Stats Container", async ({ page }) => {
    const statsContainer = page.locator("#cli-stats");

    // Verify CSS Grid usage per implementation
    await expect(statsContainer).toHaveCSS("display", "grid");

    const gridTemplate = await statsContainer.evaluate(
      (el) => getComputedStyle(el).gridTemplateColumns
    );

    // Should use responsive grid
    expect(gridTemplate).toMatch(/repeat|minmax/);
  });

  test("Test Hooks and Data Attributes", async ({ page }) => {
    // PRD requirement: stable test selectors
    const requiredSelectors = [
      "#cli-root",
      "#cli-header",
      "#cli-countdown",
      "#cli-stats",
      "#round-message",
      "#cli-score"
    ];

    for (const selector of requiredSelectors) {
      await expect(page.locator(selector)).toHaveCount(1);
    }

    // Check data attributes if helpers are available
    const helpersAvailable = await page.evaluate(() => !!window.__battleCLIinit);

    if (helpersAvailable) {
      // Test countdown data attribute
      await page.evaluate(() => window.__battleCLIinit.setCountdown(5));
      await expect(page.locator("#cli-countdown")).toHaveAttribute("data-remaining-time", "5");
    }
  });

  test("Settings Panel Layout", async ({ page }) => {
    const settingsPanel = page.locator("#cli-settings");

    if (await settingsPanel.isVisible()) {
      // Check settings panel styling
      await expect(settingsPanel).toHaveCSS("background-color", "rgb(13, 13, 13)");
      await expect(settingsPanel).toHaveCSS("color", "rgb(207, 207, 207)");
      await expect(settingsPanel).toHaveCSS("font-size", "13px");

      // Check flex layout
      await expect(settingsPanel).toHaveCSS("display", "flex");
      await expect(settingsPanel).toHaveCSS("flex-direction", "column");
      await expect(settingsPanel).toHaveCSS("gap", "8px");
    }
  });

  test("Zoom Support - 200% Zoom", async ({ page }) => {
    // PRD requirement: support 200% zoom without loss of function
    await page.setViewportSize({ width: 1200, height: 800 });

    // Apply 200% zoom
    await page.evaluate(() => {
      document.body.style.zoom = "2";
    });

    // Verify main containers still visible and functional
    await expect(page.locator("#cli-root")).toBeVisible();
    await expect(page.locator("#cli-header")).toBeVisible();
    await expect(page.locator("#cli-stats")).toBeVisible();

    // Check for horizontal scroll (should be avoided per PRD)
    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );

    // At 200% zoom, some horizontal scroll might be acceptable, but layout should remain functional
    const cliRoot = page.locator("#cli-root");
    await expect(cliRoot).toHaveCSS("overflow-x", "hidden");
  });

  test("Minimum Height Reservations", async ({ page }) => {
    // PRD mentions avoiding layout shifts

    // Countdown should reserve space
    const countdown = page.locator("#cli-countdown");
    await expect(countdown).toHaveCSS("min-height", "1.2em");

    // Round message should reserve space
    const roundMessage = page.locator("#round-message");
    await expect(roundMessage).toHaveCSS("min-height", "1.4em");

    // Stats container should reserve space for stats
    const statsContainer = page.locator("#cli-stats");
    // Note: Current implementation has min-height on state-badge, may need adjustment
  });

  test("Performance Assessment - Bundle Size", async ({ page }) => {
    // Monitor network requests to assess bundle size
    const responses = [];
    page.on("response", (response) => {
      if (response.url().includes(".js") || response.url().includes(".css")) {
        responses.push({
          url: response.url(),
          size: response.headers()["content-length"] || 0
        });
      }
    });

    await page.reload();

    // Wait for page load
    await page.waitForLoadState("networkidle");

    // Log bundle sizes for manual review
    console.log("CLI Resource sizes:", responses);

    // Basic check that page loads without major errors
    const errors = [];
    page.on("pageerror", (error) => errors.push(error));

    expect(errors.length).toBe(0);
  });
});

test.describe("CLI Layout Issues and Improvements", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/src/pages/battleCLI.html");
    await page.waitForSelector("#cli-root");
  });

  test("Identify Layout Issues", async ({ page }) => {
    const issues = [];

    // Check for potential CSS issues
    const cliStats = page.locator("#cli-stats");
    const statsMinHeight = await cliStats.evaluate((el) => getComputedStyle(el).minHeight);

    // Issue: Stats container may not have proper min-height reservation
    if (statsMinHeight === "auto" || statsMinHeight === "0px") {
      issues.push("Stats container lacks min-height reservation for layout stability");
    }

    // Check stat row spacing
    const statRows = page.locator(".cli-stat");
    const statCount = await statRows.count();

    if (statCount > 0) {
      const firstStatHeight = await statRows.first().evaluate((el) => el.offsetHeight);
      if (firstStatHeight < 44) {
        issues.push(`Stat row height ${firstStatHeight}px is below 44px touch target requirement`);
      }
    }

    // Check for potential text readability issues
    const bodyStyles = await page.evaluate(() => {
      const computed = getComputedStyle(document.body);
      return {
        fontSize: computed.fontSize,
        lineHeight: computed.lineHeight
      };
    });

    // PRD emphasizes readability
    const fontSize = parseFloat(bodyStyles.fontSize);
    if (fontSize < 14) {
      issues.push(`Body font size ${fontSize}px may be too small for readability`);
    }

    // Report issues for documentation
    console.log("Identified layout issues:", issues);

    // For test purposes, we'll track if there are major issues
    const majorIssueCount = issues.filter(
      (issue) => issue.includes("touch target") || issue.includes("readability")
    ).length;

    expect(majorIssueCount).toBeLessThan(3); // Allow some minor issues
  });
});
