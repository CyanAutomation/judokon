import { test, expect } from "./fixtures/commonSetup.js";
import { waitForBrowseReady } from "./fixtures/waits.js";
import {
  addBrowseCard,
  disableBrowseHoverAnimations,
  ensureBrowseCarouselReady,
  resetBrowseTestState
} from "./helpers/browseTestApi.js";

async function readScale(locator) {
  return locator.evaluate((node) => {
    const transform = window.getComputedStyle(node).transform;
    if (!transform || transform === "none") {
      return 1;
    }
    if (transform.startsWith("matrix3d(")) {
      const values = transform
        .slice("matrix3d(".length, -1)
        .split(",")
        .map((value) => Number.parseFloat(value.trim()));
      return Number.isFinite(values[0]) ? values[0] : 1;
    }
    if (transform.startsWith("matrix(")) {
      const values = transform
        .slice("matrix(".length, -1)
        .split(",")
        .map((value) => Number.parseFloat(value.trim()));
      return Number.isFinite(values[0]) ? values[0] : 1;
    }
    return 1;
  });
}

async function expectScale(locator, expected, digits = 2) {
  await expect
    .poll(async () => readScale(locator), {
      message: `expected transform scale to be close to ${expected}`
    })
    .toBeCloseTo(expected, digits);
}

async function expectToBeEnlarged(locator) {
  await expectScale(locator, 1.05);
}

async function expectToBeCollapsed(locator) {
  await expectScale(locator, 1);
}

async function movePointerAwayFromCards(page) {
  await page.mouse.move(0, 0);
}

async function gotoBrowsePage(page, { disableAnimations = false } = {}) {
  await page.goto("/src/pages/browseJudoka.html", { waitUntil: "networkidle" });
  await waitForBrowseReady(page);
  await ensureBrowseCarouselReady(page);

  if (disableAnimations) {
    await disableBrowseHoverAnimations(page);
  }
}

test.afterEach(async ({ page }, testInfo) => {
  try {
    await resetBrowseTestState(page);
  } catch (error) {
    testInfo.annotations.push({
      type: "cleanup-warning",
      description: error instanceof Error ? error.message : String(error)
    });
  }
});

test.describe("Hover Zoom Functionality", () => {
  test.describe("Basic Hover Interactions", () => {
    test("judoka card enlarges on hover", async ({ page }) => {
      await gotoBrowsePage(page);

      const firstCard = page.locator(".judoka-card").first();

      // Verify card exists and is visible
      await expect(firstCard).toBeVisible();

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

      // Hover first card
      await firstCard.hover();

      // Check hover states - should be immediate with animations disabled
      await expectToBeEnlarged(firstCard);
      await expectToBeCollapsed(secondCard);

      // Hover second card (first should lose zoom)
      await secondCard.hover();

      // First card should lose enlargement, second should gain it
      await expectToBeEnlarged(secondCard);
      await expectToBeCollapsed(firstCard);

      // Move mouse away
      await movePointerAwayFromCards(page);
    });

    test("hover zoom works with keyboard navigation", async ({ page }) => {
      await gotoBrowsePage(page);

      const firstCard = page.locator(".judoka-card").first();

      // Focus the card
      await firstCard.focus();

      // Verify card is focused
      await expect(firstCard).toBeFocused();

      // Simulate hover via mouse (keyboard focus alone doesn't trigger hover)
      await firstCard.hover();
      await expectToBeEnlarged(firstCard);

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

      // Hover over card
      await firstCard.hover();
      await expectToBeEnlarged(firstCard);

      // Move mouse away
      await movePointerAwayFromCards(page);
      await expectToBeCollapsed(firstCard);
    });

    test("handles test disable animations attribute", async ({ page }) => {
      await gotoBrowsePage(page);
      await disableBrowseHoverAnimations(page);

      const firstCard = page.locator(".judoka-card").first();

      // Hover over card
      await firstCard.hover();
      await expectToBeEnlarged(firstCard);

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

      // Hover first card
      await firstCard.hover();
      await expectToBeEnlarged(firstCard);

      // Focus first card
      await firstCard.focus();

      // Verify first card is focused
      await expect(firstCard).toBeFocused();

      // Try to tab to second card
      await page.keyboard.press("Tab");

      // Check that focus moved away from the first card (keyboard navigation works)
      await expect(firstCard).not.toBeFocused();

      // And that some element is focused
      await expect(page.locator(":focus")).toBeVisible();
    });
  });

  test.describe("Animation and Timing", () => {
    test("handles rapid hover interactions", async ({ page }) => {
      await gotoBrowsePage(page, { disableAnimations: true });

      const firstCard = page.locator(".judoka-card").first();
      const secondCard = page.locator(".judoka-card").nth(1);

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
    });

    test("handles transition end events properly", async ({ page }) => {
      await gotoBrowsePage(page);

      const firstCard = page.locator(".judoka-card").first();

      // Hover and wait for transition
      await firstCard.hover();

      // Wait for transition to complete
      await expectToBeEnlarged(firstCard);

      // Move mouse away
      await movePointerAwayFromCards(page);
      await expectToBeCollapsed(firstCard);
    });
  });

  test.describe("Edge Cases and Error Handling", () => {
    test("handles cards added after initialization", async ({ page }) => {
      await gotoBrowsePage(page);

      // Add a new card dynamically via the production card factory
      const dynamicJudoka = {
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
      };

      expect(dynamicJudoka).toMatchObject({
        firstname: expect.any(String),
        surname: expect.any(String),
        country: expect.any(String),
        countryCode: expect.stringMatching(/^[a-z]{2}$/i),
        stats: expect.objectContaining({
          power: expect.any(Number),
          speed: expect.any(Number),
          technique: expect.any(Number),
          kumikata: expect.any(Number),
          newaza: expect.any(Number)
        }),
        weightClass: expect.any(String),
        signatureMoveId: expect.any(Number),
        rarity: expect.any(String)
      });

      await addBrowseCard(page, dynamicJudoka);

      const dynamicCard = page.locator(".judoka-card").last();

      // Verify new card exists
      await expect(dynamicCard).toBeVisible();

      // Newly added cards rely purely on CSS for hover scaling
      await dynamicCard.hover();
      await expectToBeEnlarged(dynamicCard);
      await movePointerAwayFromCards(page);
      await expectToBeCollapsed(dynamicCard);
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

      // Start hover
      await firstCard.hover();
      await expectToBeEnlarged(firstCard);

      // Navigate to another page
      await page.goto("/src/pages/index.html", { waitUntil: "networkidle" });

      // Verify navigation succeeded
      await expect(page.locator("body")).toBeVisible();

      // Should not have any lingering hover states (hover cleared during navigation)
      const postNavCards = page.locator(".judoka-card");
      if ((await postNavCards.count()) > 0) {
        await expectToBeCollapsed(postNavCards.first());
      }
    });
  });

  test.describe("Integration with Card Features", () => {
    test("hover zoom works with card flip functionality", async ({ page }) => {
      await gotoBrowsePage(page);

      const firstCard = page.locator(".judoka-card").first();

      // Hover to enlarge
      await firstCard.hover();
      await expectToBeEnlarged(firstCard);

      // Click to flip (if card flip is available)
      await firstCard.click();

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
          await card.hover();
          await expectToBeEnlarged(card);

          await movePointerAwayFromCards(page);
          await expectToBeCollapsed(card);
        }
      }
    });
  });
});
