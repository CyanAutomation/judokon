/**
 * @file Card Aspect Ratio Tests
 * @description Tests to verify judoka cards maintain 2:3 aspect ratio as per PRD requirements
 */

import { test, expect } from "./fixtures/commonSetup.js";

test.describe("Card Aspect Ratio Verification", () => {
  test("should measure card dimensions on Random Judoka page", async ({ page }) => {
    await page.goto("/src/pages/randomJudoka.html");
    await page.locator('body[data-random-judoka-ready="true"]').waitFor();

    // Click draw button to generate a card
    await page.getByRole("button", { name: /draw a random judoka card/i }).click();

    // Wait for card to be visible
    const card = page.locator(".judoka-card").first();
    await expect(card).toBeVisible({ timeout: 10000 });

    // Get card dimensions
    const box = await card.boundingBox();

    if (box) {
      const width = box.width;
      const height = box.height;
      const actualRatio = width / height;
      const expectedRatio = 2 / 3; // 0.6667
      const tolerance = 0.05; // 5% tolerance

      console.log(`Card dimensions: ${width}px × ${height}px`);
      console.log(`Actual ratio: ${actualRatio.toFixed(4)}`);
      console.log(`Expected ratio: ${expectedRatio.toFixed(4)}`);
      console.log(`Difference: ${Math.abs(actualRatio - expectedRatio).toFixed(4)}`);

      // Log card computed styles
      const computedStyles = await card.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          width: styles.width,
          height: styles.height,
          minHeight: styles.minHeight,
          gridTemplateRows: styles.gridTemplateRows,
          padding: styles.padding,
          border: styles.border
        };
      });
      console.log("Computed styles:", JSON.stringify(computedStyles, null, 2));

      // Measure individual card sections
      const sections = await card.evaluate((el) => {
        const topBar = el.querySelector(".card-top-bar");
        const portrait = el.querySelector(".card-portrait");
        const stats = el.querySelector(".card-stats");
        const signature = el.querySelector(".signature-move-container");

        return {
          topBar: topBar ? topBar.getBoundingClientRect().height : 0,
          portrait: portrait ? portrait.getBoundingClientRect().height : 0,
          stats: stats ? stats.getBoundingClientRect().height : 0,
          signature: signature ? signature.getBoundingClientRect().height : 0,
          total: el.getBoundingClientRect().height
        };
      });
      console.log("Section heights:", JSON.stringify(sections, null, 2));
      console.log(
        `Total sections: ${(sections.topBar + sections.portrait + sections.stats + sections.signature).toFixed(2)}px`
      );

      // Check if ratio is within tolerance
      expect(Math.abs(actualRatio - expectedRatio)).toBeLessThan(tolerance);
    } else {
      throw new Error("Could not get card bounding box");
    }
  });

  test("should measure card dimensions on Browse Judoka page", async ({ page }) => {
    await page.goto("/src/pages/browseJudoka.html");
    await page.locator('body[data-browse-ready="true"]').waitFor();

    // Wait for cards to be visible
    const card = page.locator(".judoka-card").first();
    await expect(card).toBeVisible({ timeout: 10000 });

    const box = await card.boundingBox();

    if (box) {
      const width = box.width;
      const height = box.height;
      const actualRatio = width / height;
      const expectedRatio = 2 / 3;

      console.log(`Browse page card: ${width}px × ${height}px`);
      console.log(`Ratio: ${actualRatio.toFixed(4)} (expected: ${expectedRatio.toFixed(4)})`);

      const tolerance = 0.05;
      expect(Math.abs(actualRatio - expectedRatio)).toBeLessThan(tolerance);
    }
  });

  test("should measure card dimensions on Card of the Day page", async ({ page }) => {
    await page.goto("/src/pages/cardOfTheDay.html");
    await page.locator('body[data-card-ready="true"]').waitFor();

    const card = page.locator(".judoka-card").first();
    await expect(card).toBeVisible({ timeout: 10000 });

    const box = await card.boundingBox();

    if (box) {
      const width = box.width;
      const height = box.height;
      const actualRatio = width / height;
      const expectedRatio = 2 / 3;

      console.log(`Card of the Day: ${width}px × ${height}px`);
      console.log(`Ratio: ${actualRatio.toFixed(4)} (expected: ${expectedRatio.toFixed(4)})`);

      const tolerance = 0.05;
      expect(Math.abs(actualRatio - expectedRatio)).toBeLessThan(tolerance);
    }
  });

  test("should verify card aspect ratio across different viewport sizes", async ({ page }) => {
    const viewports = [
      { width: 375, height: 667, name: "iPhone SE" },
      { width: 768, height: 1024, name: "iPad" },
      { width: 1920, height: 1080, name: "Desktop" }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/src/pages/randomJudoka.html");
      await page.locator('body[data-random-judoka-ready="true"]').waitFor();

      // Click draw button
      await page.getByRole("button", { name: /draw a random judoka card/i }).click();

      const card = page.locator(".judoka-card").first();
      await expect(card).toBeVisible({ timeout: 10000 });

      const box = await card.boundingBox();

      if (box) {
        const actualRatio = box.width / box.height;
        const expectedRatio = 2 / 3;

        console.log(
          `${viewport.name} (${viewport.width}×${viewport.height}): ${box.width.toFixed(0)}×${box.height.toFixed(0)}px, ratio: ${actualRatio.toFixed(4)}`
        );

        const tolerance = 0.05;
        expect(Math.abs(actualRatio - expectedRatio)).toBeLessThan(tolerance);
      }
    }
  });
});
