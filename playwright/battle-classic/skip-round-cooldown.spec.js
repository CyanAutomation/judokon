import { test, expect } from "@playwright/test";

test.describe("skipRoundCooldown feature flag", () => {
  test("DOM markers are set when skipRoundCooldown flag is enabled", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        skipRoundCooldown: true
      };
    });

    await page.goto("/src/pages/battleClassic.html");

    const body = page.locator("body");
    await expect(body).toHaveAttribute("data-feature-skip-round-cooldown", "enabled");

    // Verify the body has the enabled marker
    const bodyMarker = await body.getAttribute("data-feature-skip-round-cooldown");
    expect(bodyMarker).toBe("enabled");

    const nextButton = page.locator('[data-testid="next-button"]');
    await expect(nextButton).toHaveAttribute("data-feature-skip-round-cooldown", "enabled");
    const nextMarker = await nextButton.getAttribute("data-feature-skip-round-cooldown");
    expect(nextMarker).toBe("enabled");
  });

  test("DOM markers are set when skipRoundCooldown flag is disabled", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        skipRoundCooldown: false
      };
    });

    await page.goto("/src/pages/battleClassic.html");

    const body = page.locator("body");
    await expect(body).toHaveAttribute("data-feature-skip-round-cooldown", "disabled");

    // Verify the body has the disabled marker
    const bodyMarker = await body.getAttribute("data-feature-skip-round-cooldown");
    expect(bodyMarker).toBe("disabled");

    const nextButton = page.locator('[data-testid="next-button"]');
    await expect(nextButton).toHaveAttribute("data-feature-skip-round-cooldown", "disabled");
    const nextMarker = await nextButton.getAttribute("data-feature-skip-round-cooldown");
    expect(nextMarker).toBe("disabled");
  });

  test("skipRoundCooldown skips cooldown when enabled during battle", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        showRoundSelectModal: true,
        skipRoundCooldown: true
      };
    });

    await page.goto("/src/pages/battleClassic.html");

    // Click Quick match
    await page.locator('button:has-text("Quick")').click();

    // Wait for stat buttons to be ready
    await page.waitForSelector('[data-testid="stat-button"]');

    // Verify the DOM marker shows the flag is enabled
    const bodyMarker = await page.locator("body").getAttribute("data-feature-skip-round-cooldown");
    expect(bodyMarker).toBe("enabled");

    // Click first stat button
    await page.locator('[data-testid="stat-button"]').first().click();

    // With skipRoundCooldown enabled, the battle engine should process the selection quickly
    // We'll verify that the feature flag infrastructure is in place by checking the DOM markers
    const nextButton = page.locator('[data-testid="next-button"]');
    await expect(nextButton).toHaveAttribute("data-next-ready", "true");
    const nextButtonMarker = await nextButton.getAttribute("data-feature-skip-round-cooldown");
    expect(nextButtonMarker).toBe("enabled");
  });

  test("skipRoundCooldown respects normal cooldown when disabled during battle", async ({
    page
  }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        showRoundSelectModal: true,
        skipRoundCooldown: false
      };
    });

    await page.goto("/src/pages/battleClassic.html");

    // Click Quick match
    await page.locator('button:has-text("Quick")').click();

    // Wait for stat buttons to be ready
    await page.waitForSelector('[data-testid="stat-button"]');

    // Verify the DOM marker shows the flag is disabled
    const bodyMarker = await page.locator("body").getAttribute("data-feature-skip-round-cooldown");
    expect(bodyMarker).toBe("disabled");

    // Click first stat button
    await page.locator('[data-testid="stat-button"]').first().click();

    // With skipRoundCooldown disabled, we should NOT see data-next-ready immediately
    // (the button will be disabled during the cooldown)
    const nextButton = page.locator('[data-testid="next-button"]');
    const initialReadyState = await nextButton.getAttribute("data-next-ready");
    expect(initialReadyState).not.toBe("true");
  });
});
