import { test, expect } from "@playwright/test";

test.describe("enableTestMode feature flag", () => {
  test("test mode flag sets data-test-mode on battle-area when enabled", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        enableTestMode: true
      };
    });

    await page.goto("/src/pages/battleClassic.html");

    // Wait for the battle-area element to exist and have the test-mode marker
    await page.waitForFunction(
      () => document.getElementById("battle-area")?.getAttribute("data-test-mode") === "true",
      { timeout: 5000 }
    );

    const battleArea = page.locator("#battle-area");
    const testModeMarker = await battleArea.getAttribute("data-test-mode");
    expect(testModeMarker).toBe("true");
  });

  test("test mode flag removes data-test-mode from battle-area when disabled", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        enableTestMode: false
      };
    });

    await page.goto("/src/pages/battleClassic.html");

    // Wait for page to initialize
    await page.waitForTimeout(1000);

    const battleArea = page.locator("#battle-area");
    const testModeMarker = await battleArea.getAttribute("data-test-mode");
    expect(testModeMarker).not.toBe("true");
  });
});

test.describe("battleStateBadge feature flag", () => {
  test("body reflects badge enabled state with DOM marker", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        battleStateBadge: true
      };
    });

    await page.goto("/src/pages/battleClassic.html");

    // Wait for the feature marker to be applied
    await page.waitForFunction(
      () => document.body?.getAttribute("data-feature-battle-state-badge") === "enabled",
      { timeout: 5000 }
    );

    const bodyMarker = await page.locator("body").getAttribute("data-feature-battle-state-badge");
    expect(bodyMarker).toBe("enabled");
  });

  test("body reflects badge disabled state with DOM marker", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        battleStateBadge: false
      };
    });

    await page.goto("/src/pages/battleClassic.html");

    // Wait for the feature marker to be applied
    await page.waitForFunction(
      () => document.body?.getAttribute("data-feature-battle-state-badge") === "disabled",
      { timeout: 5000 }
    );

    const bodyMarker = await page.locator("body").getAttribute("data-feature-battle-state-badge");
    expect(bodyMarker).toBe("disabled");
  });

  test("badge element appears when enabled", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        battleStateBadge: true
      };
    });

    await page.goto("/src/pages/battleClassic.html");

    // Wait for the badge to appear
    await page.waitForSelector("#battle-state-badge", { timeout: 5000 });

    const badge = page.locator("#battle-state-badge");
    await expect(badge).toBeVisible();
  });

  test("badge element does not appear when disabled", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        battleStateBadge: false
      };
    });

    await page.goto("/src/pages/battleClassic.html");

    // Give page time to load
    await page.waitForTimeout(1000);

    const badge = page.locator("#battle-state-badge");
    const isVisible = await badge.isVisible().catch(() => false);
    expect(isVisible).toBe(false);
  });
});

test.describe("tooltipOverlayDebug feature flag", () => {
  test("overlay debug mode sets body class when enabled", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        tooltipOverlayDebug: true
      };
    });

    await page.goto("/src/pages/tooltipViewer.html");

    // Wait for the flag to be applied
    await page.waitForFunction(
      () => document.body?.classList.contains("tooltip-overlay-debug") === true,
      { timeout: 5000 }
    );

    // Verify the body has the debug class
    const hasDebugClass = await page
      .locator("body")
      .evaluate((el) => el.classList.contains("tooltip-overlay-debug"));
    expect(hasDebugClass).toBe(true);
  });

  test("overlay debug mode removes body class when disabled", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        tooltipOverlayDebug: false
      };
    });

    await page.goto("/src/pages/tooltipViewer.html");

    // Wait for page to load
    await page.waitForTimeout(1000);

    // Verify the body does NOT have the debug class
    const hasDebugClass = await page
      .locator("body")
      .evaluate((el) => el.classList.contains("tooltip-overlay-debug"));
    expect(hasDebugClass).toBe(false);
  });
});

test.describe("enableCardInspector feature flag", () => {
  test("card inspector DOM marker set to enabled when flag enabled", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        enableCardInspector: true
      };
    });

    await page.goto("/src/pages/randomJudoka.html");

    // Wait for a card to be rendered
    await page.waitForSelector(".judoka-card", { timeout: 5000 });

    // Verify card has the enabled marker
    const card = page.locator(".judoka-card").first();
    await expect(card).toHaveAttribute("data-feature-card-inspector", "enabled");
  });

  test("card inspector DOM marker set to disabled when flag disabled", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        enableCardInspector: false
      };
    });

    await page.goto("/src/pages/randomJudoka.html");

    // Wait for a card to be rendered
    await page.waitForSelector(".judoka-card", { timeout: 5000 });

    // Verify card has the disabled marker
    const card = page.locator(".judoka-card").first();
    await expect(card).toHaveAttribute("data-feature-card-inspector", "disabled");
  });
});
