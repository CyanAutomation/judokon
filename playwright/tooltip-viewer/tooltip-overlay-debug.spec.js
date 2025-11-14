import { test, expect } from "../fixtures/commonSetup.js";

test.describe("tooltipOverlayDebug feature flag", () => {
  test("outlines tooltip targets when enabled", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        tooltipOverlayDebug: true
      };
    });

    const body = page.locator("body");
    await page.goto("/src/pages/tooltipViewer.html");

    await expect
      .poll(async () => ({
        classMarker: await body.evaluate((el) => el.classList.contains("tooltip-overlay-debug")),
        dataMarker: await body.getAttribute("data-feature-tooltip-overlay-debug")
      }))
      .toEqual({
        classMarker: true,
        dataMarker: "enabled"
      });

    await page.goto("/src/pages/browseJudoka.html");

    // The browse judoka page exposes real tooltip targets so we can observe overlay styles without injecting probes.
    const tooltipTargets = page.locator("[data-tooltip-id]");
    await expect(tooltipTargets).not.toHaveCount(0);
    const tooltipTarget = tooltipTargets.first();
    await expect(tooltipTarget).toBeVisible();
    const tooltipId = await tooltipTarget.getAttribute("data-tooltip-id");
    expect(tooltipId).not.toBeNull();
    await expect(tooltipTarget).toHaveCSS("outline-style", "dashed");
    await expect(tooltipTarget).not.toHaveCSS("outline-width", "0px");
  });

  test("removes overlay markers when disabled", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        tooltipOverlayDebug: false
      };
    });

    const body = page.locator("body");
    await page.goto("/src/pages/tooltipViewer.html");

    await expect
      .poll(async () => ({
        classMarker: await body.evaluate((el) => el.classList.contains("tooltip-overlay-debug")),
        dataMarker: await body.getAttribute("data-feature-tooltip-overlay-debug")
      }))
      .toEqual({
        classMarker: false,
        dataMarker: "disabled"
      });

    await page.goto("/src/pages/browseJudoka.html");

    // Reuse a real tooltip target rather than mutating the DOM to fabricate one for style checks.
    const tooltipTargets = page.locator("[data-tooltip-id]");
    await expect(tooltipTargets).not.toHaveCount(0);
    const tooltipTarget = tooltipTargets.first();
    await expect(tooltipTarget).toBeVisible();
    await expect(tooltipTarget).toHaveCSS("outline-style", "none");
    await expect(tooltipTarget).toHaveCSS("outline-width", "0px");
  });
});
