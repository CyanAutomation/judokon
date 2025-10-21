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

  test("test mode banner announces active seed when enabled", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        enableTestMode: true
      };
    });

    await page.goto("/src/pages/battleClassic.html");

    const banner = page.locator("#test-mode-banner");

    await expect
      .poll(async () => ({
        hidden: await banner.getAttribute("hidden"),
        marker: await banner.getAttribute("data-feature-test-mode"),
        text: (await banner.textContent())?.trim()
      }))
      .toMatchObject({
        hidden: null,
        marker: "banner"
      });

    await expect(banner).toBeVisible();
    await expect(banner).toHaveAttribute("data-feature-test-mode", "banner");
    await expect(banner).toHaveText(/^Test Mode active \(seed \d+\)$/);
  });

  test("test mode flag removes data-test-mode from battle-area when disabled", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        enableTestMode: false
      };
    });

    await page.goto("/src/pages/battleClassic.html");

    const battleArea = page.locator("#battle-area");
    await expect
      .poll(async () => await battleArea.getAttribute("data-test-mode"))
      .toBeNull();
    const testModeMarker = await battleArea.getAttribute("data-test-mode");
    expect(testModeMarker).not.toBe("true");
  });

  test("test mode banner hides when flag disabled", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        enableTestMode: false
      };
    });

    await page.goto("/src/pages/battleClassic.html");

    const banner = page.locator("#test-mode-banner");

    await expect
      .poll(async () => ({
        hidden: await banner.getAttribute("hidden"),
        hasMarker: await banner.getAttribute("data-feature-test-mode"),
        text: (await banner.textContent())?.trim()
      }))
      .toEqual({
        hidden: "",
        hasMarker: null,
        text: ""
      });

    await expect(banner).toBeHidden();
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

    await expect(page.locator("body")).toHaveAttribute(
      "data-feature-battle-state-badge",
      "disabled"
    );

    const badge = page.locator("#battle-state-badge");
    await expect(badge).toHaveCount(0);
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

    const body = page.locator("body");
    await expect(body).toHaveAttribute("data-feature-tooltip-overlay-debug", "disabled");
    await expect
      .poll(() =>
        body.evaluate((el) => el.classList.contains("tooltip-overlay-debug"))
      )
      .toBe(false);
  });
});

test.describe("enableCardInspector feature flag", () => {
  test("card inspector flag override is set correctly on page", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        enableCardInspector: true
      };
    });

    await page.goto("/src/pages/randomJudoka.html");

    await expect(page.locator("body")).toHaveAttribute("data-random-judoka-ready", "true");
    await expect
      .poll(() =>
        page.evaluate(() => window.__FF_OVERRIDES?.enableCardInspector ?? null)
      )
      .toBe(true);
  });

  test("card inspector flag override disabled correctly on page", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        enableCardInspector: false
      };
    });

    await page.goto("/src/pages/randomJudoka.html");

    await expect(page.locator("body")).toHaveAttribute("data-random-judoka-ready", "true");
    await expect
      .poll(() =>
        page.evaluate(() => window.__FF_OVERRIDES?.enableCardInspector ?? null)
      )
      .toBe(false);
  });
});
