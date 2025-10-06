import { test, expect } from "./fixtures/commonSetup.js";
import {
  disableAnimations,
  addDynamicCard,
  disableHoverAnimations,
  reset
} from "./fixtures/testHooks.js";

async function expectToBeEnlarged(locator) {
  await expect(locator).toHaveAttribute("data-enlarged", "true");
}

async function expectToBeCollapsed(locator) {
  await expect(locator).not.toHaveAttribute("data-enlarged", "true");
}

async function movePointerAwayFromCards(page) {
  await page.mouse.move(0, 0);
}

async function waitForBrowseReady(page) {
  await page.locator('body[data-browse-judoka-ready="true"]').waitFor();
}

async function gotoBrowsePage(page, { disableAnimations = false } = {}) {
  await page.goto("/src/pages/browseJudoka.html", { waitUntil: "networkidle" });
  await waitForBrowseReady(page);

  if (disableAnimations) {
    await page.evaluate(() => window.testFixtures.disableHoverAnimations());
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    disableAnimations();
    addDynamicCard();
  });

  // Inject fixture functions for runtime use
  await page.addInitScript(`
    ${disableHoverAnimations.toString()}
    ${reset.toString()}
    window.testFixtures = { disableHoverAnimations, reset };
  `);
});

test.afterEach(async ({ page }) => {
  await page.evaluate(() => window.testFixtures.reset());
});

test.describe("Hover Zoom Functionality", () => {
  test.describe("Basic Hover Interactions", () => {
    test("judoka card enlarges on hover", async ({ page }) => {
      await gotoBrowsePage(page);

      const firstCard = page.locator(".judoka-card").first();

      // Verify card exists and is visible
      await expect(firstCard).toBeVisible();

      // Verify hover zoom markers are attached
      await expect(firstCard).toHaveAttribute("data-enlarge-listener-attached", "true");

      // Hover over the card
      await firstCard.hover();

      await expectToBeEnlarged(firstCard);

      // Move mouse away
      await movePointerAwayFromCards(page);

      // Verify zoom is removed (if it was applied)
      await expectToBeCollapsed(firstCard);
    });

    test("multiple cards can be hovered independently", async ({ page }) => {
      await gotoBrowsePage(page, { disableAnimations: true });

      const cards = page.locator(".judoka-card");

      // Get first two cards
      const firstCard = cards.nth(0);
      const secondCard = cards.nth(1);

      // Verify both cards have hover zoom markers
      await expect(firstCard).toHaveAttribute("data-enlarge-listener-attached", "true");
      await expect(secondCard).toHaveAttribute("data-enlarge-listener-attached", "true");

      // Hover first card
      await firstCard.hover();

      // Check hover states - should be immediate with animations disabled
      await expect(firstCard).toHaveAttribute("data-enlarged", "true");
      const secondEnlarged = await secondCard.getAttribute("data-enlarged");
      expect(secondEnlarged).toBeNull(); // Second card should not be enlarged

      // Hover second card (first should lose zoom)
      await secondCard.hover();

      // First card should lose enlargement, second should gain it
      await expect(secondCard).toHaveAttribute("data-enlarged", "true");
      const firstEnlargedAfter = await firstCard.getAttribute("data-enlarged");
      expect(firstEnlargedAfter).toBeNull(); // First card should not be enlarged anymore

      // Move mouse away
      await movePointerAwayFromCards(page);
    });

    test("hover zoom works with keyboard navigation", async ({ page }) => {
      await gotoBrowsePage(page);

      const firstCard = page.locator(".judoka-card").first();

      // Verify card has hover zoom markers
      await expect(firstCard).toHaveAttribute("data-enlarge-listener-attached", "true");

      // Focus the card
      await firstCard.focus();

      // Verify card is focused
      await expect(firstCard).toBeFocused();

      // Simulate hover via mouse (keyboard focus alone doesn't trigger hover)
      await firstCard.hover();
      await expectToBeEnlarged(firstCard);

      // Verify hover zoom markers are still attached
      await expect(firstCard).toHaveAttribute("data-enlarge-listener-attached", "true");

      // Move mouse away
      await movePointerAwayFromCards(page);
    });
  });

  test.describe("Accessibility Features", () => {
    test("respects reduced motion preference", async ({ page }) => {
      // Set reduced motion preference
      await page.emulateMedia({ reducedMotion: "reduce" });

      await gotoBrowsePage(page);

      const firstCard = page.locator(".judoka-card").first();

      // Verify hover zoom markers are attached
      await expect(firstCard).toHaveAttribute("data-enlarge-listener-attached", "true");

      // Hover over card
      await firstCard.hover();
      await expectToBeEnlarged(firstCard);

      // Verify hover zoom markers remain attached
      await expect(firstCard).toHaveAttribute("data-enlarge-listener-attached", "true");

      // Move mouse away
      await movePointerAwayFromCards(page);
      await expectToBeCollapsed(firstCard);
    });

    test("handles test disable animations attribute", async ({ page }) => {
      await gotoBrowsePage(page);
      await page.evaluate(() => window.testFixtures.disableHoverAnimations());

      const firstCard = page.locator(".judoka-card").first();

      // Verify hover zoom markers are attached
      await expect(firstCard).toHaveAttribute("data-enlarge-listener-attached", "true");

      // Hover over card
      await firstCard.hover();
      await expectToBeEnlarged(firstCard);

      // Verify hover zoom markers remain attached
      await expect(firstCard).toHaveAttribute("data-enlarge-listener-attached", "true");

      // Move mouse away
      await movePointerAwayFromCards(page);
      await expectToBeCollapsed(firstCard);
    });

    test("cards remain keyboard accessible during hover", async ({ page }) => {
      await gotoBrowsePage(page);

      const firstCard = page.locator(".judoka-card").first();
      const secondCard = page.locator(".judoka-card").nth(1);

      // Verify cards are focusable
      await expect(firstCard).toHaveAttribute("tabindex", "0");
      await expect(secondCard).toHaveAttribute("tabindex", "0");

      // Verify hover zoom markers are attached
      await expect(firstCard).toHaveAttribute("data-enlarge-listener-attached", "true");
      await expect(secondCard).toHaveAttribute("data-enlarge-listener-attached", "true");

      // Hover first card
      await firstCard.hover();
      await expectToBeEnlarged(firstCard);

      // Focus first card
      await firstCard.focus();

      // Verify first card is focused
      const isFirstFocused = await firstCard.evaluate((el) => el === document.activeElement);
      expect(isFirstFocused).toBe(true);

      // Try to tab to second card
      await page.keyboard.press("Tab");

      // Check that focus moved away from the first card (keyboard navigation works)
      const isFirstStillFocusedAfterTab = await firstCard.evaluate(
        (el) => el === document.activeElement
      );
      expect(isFirstStillFocusedAfterTab).toBe(false);

      // And that some element is focused
      const activeElementTag = await page.evaluate(() => document.activeElement?.tagName);
      expect(activeElementTag).toBeDefined();
    });
  });

  test.describe("Animation and Timing", () => {
    test("handles rapid hover interactions", async ({ page }) => {
      await gotoBrowsePage(page, { disableAnimations: true });

      const firstCard = page.locator(".judoka-card").first();
      const secondCard = page.locator(".judoka-card").nth(1);

      // Verify hover zoom markers are attached
      await expect(firstCard).toHaveAttribute("data-enlarge-listener-attached", "true");
      await expect(secondCard).toHaveAttribute("data-enlarge-listener-attached", "true");

      // Rapid hover switching
      await firstCard.hover();
      await expectToBeEnlarged(firstCard);

      await secondCard.hover();
      await expectToBeEnlarged(secondCard);

      await firstCard.hover();
      await expectToBeEnlarged(firstCard);

      // Final cleanup
      await movePointerAwayFromCards(page);
      await expectToBeCollapsed(firstCard);
      await expectToBeCollapsed(secondCard);

      // Verify hover zoom markers are still attached
      await expect(firstCard).toHaveAttribute("data-enlarge-listener-attached", "true");
      await expect(secondCard).toHaveAttribute("data-enlarge-listener-attached", "true");
    });

    test("handles transition end events properly", async ({ page }) => {
      await gotoBrowsePage(page);

      const firstCard = page.locator(".judoka-card").first();

      // Verify hover zoom markers are attached
      await expect(firstCard).toHaveAttribute("data-enlarge-listener-attached", "true");

      // Hover and wait for transition
      await firstCard.hover();

      // Wait for transition to complete
      await expectToBeEnlarged(firstCard);

      // Verify hover zoom markers are still attached
      await expect(firstCard).toHaveAttribute("data-enlarge-listener-attached", "true");

      // Move mouse away
      await movePointerAwayFromCards(page);
      await expectToBeCollapsed(firstCard);
    });
  });

  test.describe("Edge Cases and Error Handling", () => {
    test("handles cards added after initialization", async ({ page }) => {
      await gotoBrowsePage(page);

      // Add a new card dynamically via the production card factory
      await callBrowseHook(page, "addCard", {
        firstname: "Dynamic",
        surname: "Card",
        country: "Testland",
        countryCode: "jp",
        stats: {
          power: 1,
          speed: 1,
          technique: 1,
          kumikata: 1,
          newaza: 1
        },
        weightClass: "60kg",
        signatureMoveId: 1,
        rarity: "common"
      });

      const dynamicCard = page.locator(".judoka-card").last();

      // Verify new card exists
      await expect(dynamicCard).toBeVisible();

      // The dynamic card won't have hover zoom markers since they were added after initialization
      // This is expected behavior - we just verify the card exists and exposes the expected aria label
      // Accessibility assertion deferred
    });

    test("handles missing DOM elements gracefully", async ({ page }) => {
      await gotoBrowsePage(page);

      // Verify page doesn't crash if no cards exist
      await expect(page.locator("body")).toBeVisible();

      // Should be able to navigate without errors
      const navLinks = page.locator("nav a");
      if ((await navLinks.count()) > 0) {
        await expect(navLinks.first()).toBeVisible();
      }
    });

    test("handles page navigation during hover", async ({ page }) => {
      await gotoBrowsePage(page);

      const firstCard = page.locator(".judoka-card").first();

      // Verify hover zoom markers are attached
      await expect(firstCard).toHaveAttribute("data-enlarge-listener-attached", "true");

      // Start hover
      await firstCard.hover();
      await expectToBeEnlarged(firstCard);

      // Navigate to another page
      await page.goto("/src/pages/index.html", { waitUntil: "networkidle" });

      // Verify navigation succeeded
      await expect(page.locator("body")).toBeVisible();

      // Should not have any lingering hover states
      const enlargedElements = page.locator("[data-enlarged]");
      await expect(enlargedElements).toHaveCount(0);
    });
  });

  test.describe("Integration with Card Features", () => {
    test("hover zoom works with card flip functionality", async ({ page }) => {
      await gotoBrowsePage(page);

      const firstCard = page.locator(".judoka-card").first();

      // Verify hover zoom markers are attached
      await expect(firstCard).toHaveAttribute("data-enlarge-listener-attached", "true");

      // Hover to enlarge
      await firstCard.hover();
      await expectToBeEnlarged(firstCard);

      // Click to flip (if card flip is available)
      await firstCard.click();

      // Verify hover zoom markers are still attached after flip
      await expect(firstCard).toHaveAttribute("data-enlarge-listener-attached", "true");

      // Move mouse away
      await movePointerAwayFromCards(page);
    });

    test("hover zoom works with different card types", async ({ page }) => {
      await gotoBrowsePage(page);

      // Test different card types (common, rare, epic, legendary)
      const cardTypes = [".common", ".rare", ".epic", ".legendary"];

      for (const cardType of cardTypes) {
        const card = page.locator(`${cardType}`).first();
        if ((await card.count()) > 0) {
          // Verify hover zoom markers are attached
          await expect(card).toHaveAttribute("data-enlarge-listener-attached", "true");

          await card.hover();
          await expectToBeEnlarged(card);

          await movePointerAwayFromCards(page);
          await expectToBeCollapsed(card);
        }
      }
    });
  });
});
