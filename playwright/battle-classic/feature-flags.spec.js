import { test, expect } from "@playwright/test";
import { resolveFeatureFlagEnabled, waitForFeatureFlagState } from "../helpers/featureFlagHelper.js";

test.describe("enableTestMode feature flag", () => {
  test("test mode flag sets data-test-mode on battle-area when enabled", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        enableTestMode: true
      };
    });

    await page.goto("/src/pages/battleClassic.html");

    const snapshot = await waitForFeatureFlagState(page, "enableTestMode", true);
    expect(resolveFeatureFlagEnabled(snapshot, "enableTestMode")).toBe(true);

    const battleArea = page.locator("#battle-area");
    await expect(battleArea).toHaveAttribute("data-test-mode", "true");
  });

  test("test mode banner announces active seed when enabled", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        enableTestMode: true
      };
    });

    await page.goto("/src/pages/battleClassic.html");

    const snapshot = await waitForFeatureFlagState(page, "enableTestMode", true);
    expect(resolveFeatureFlagEnabled(snapshot, "enableTestMode")).toBe(true);

    const banner = page.locator("#test-mode-banner");
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

    const snapshot = await waitForFeatureFlagState(page, "enableTestMode", false);
    expect(resolveFeatureFlagEnabled(snapshot, "enableTestMode")).toBe(false);

    const battleArea = page.locator("#battle-area");
    await expect(battleArea).not.toHaveAttribute("data-test-mode", "true");
    const testModeMarker = await battleArea.getAttribute("data-test-mode");
    expect(testModeMarker).toBeNull();
  });

  test("test mode banner hides when flag disabled", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        enableTestMode: false
      };
    });

    await page.goto("/src/pages/battleClassic.html");

    const snapshot = await waitForFeatureFlagState(page, "enableTestMode", false);
    expect(resolveFeatureFlagEnabled(snapshot, "enableTestMode")).toBe(false);

    const banner = page.locator("#test-mode-banner");
    await expect(banner).toBeHidden();
    await expect(banner).not.toHaveAttribute("data-feature-test-mode", "banner");
    const hidden = await banner.getAttribute("hidden");
    expect(hidden).toBe("");
    await expect(banner).toHaveText("");
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

    const snapshot = await waitForFeatureFlagState(page, "battleStateBadge", true);
    expect(resolveFeatureFlagEnabled(snapshot, "battleStateBadge")).toBe(true);

    await expect(page.locator("body")).toHaveAttribute("data-feature-battle-state-badge", "enabled");
  });

  test("body reflects badge disabled state with DOM marker", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        battleStateBadge: false
      };
    });

    await page.goto("/src/pages/battleClassic.html");

    const snapshot = await waitForFeatureFlagState(page, "battleStateBadge", false);
    expect(resolveFeatureFlagEnabled(snapshot, "battleStateBadge")).toBe(false);

    await expect(page.locator("body")).toHaveAttribute("data-feature-battle-state-badge", "disabled");
  });

  test("badge element appears when enabled", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        battleStateBadge: true
      };
    });

    await page.goto("/src/pages/battleClassic.html");

    const snapshot = await waitForFeatureFlagState(page, "battleStateBadge", true);
    expect(resolveFeatureFlagEnabled(snapshot, "battleStateBadge")).toBe(true);

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

    const snapshot = await waitForFeatureFlagState(page, "battleStateBadge", false);
    expect(resolveFeatureFlagEnabled(snapshot, "battleStateBadge")).toBe(false);

    await expect(page.locator("body")).toHaveAttribute("data-feature-battle-state-badge", "disabled");

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

    const snapshot = await waitForFeatureFlagState(page, "tooltipOverlayDebug", true);
    expect(resolveFeatureFlagEnabled(snapshot, "tooltipOverlayDebug")).toBe(true);

    const body = page.locator("body");
    await expect(body).toHaveAttribute("data-feature-tooltip-overlay-debug", "enabled");
    const hasDebugClass = await body.evaluate((el) => el.classList.contains("tooltip-overlay-debug"));
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
    const snapshot = await waitForFeatureFlagState(page, "tooltipOverlayDebug", false);
    expect(resolveFeatureFlagEnabled(snapshot, "tooltipOverlayDebug")).toBe(false);

    await expect(body).toHaveAttribute("data-feature-tooltip-overlay-debug", "disabled");
    const hasDebugClass = await body.evaluate((el) => el.classList.contains("tooltip-overlay-debug"));
    expect(hasDebugClass).toBe(false);
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

    const snapshot = await waitForFeatureFlagState(page, "enableCardInspector", true);
    expect(resolveFeatureFlagEnabled(snapshot, "enableCardInspector")).toBe(true);

    await expect(page.locator("body")).toHaveAttribute("data-random-judoka-ready", "true");
  });

  test("card inspector flag override disabled correctly on page", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        enableCardInspector: false
      };
    });

    await page.goto("/src/pages/randomJudoka.html");

    const snapshot = await waitForFeatureFlagState(page, "enableCardInspector", false);
    expect(resolveFeatureFlagEnabled(snapshot, "enableCardInspector")).toBe(false);

    await expect(page.locator("body")).toHaveAttribute("data-random-judoka-ready", "true");
  });
});
