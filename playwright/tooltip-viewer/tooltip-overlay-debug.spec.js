import { test, expect } from "@playwright/test";

test.describe("tooltipOverlayDebug feature flag", () => {
  test("outlines tooltip targets when enabled", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        tooltipOverlayDebug: true
      };
    });

    await page.goto("/src/pages/tooltipViewer.html");

    const body = page.locator("body");
    await expect
      .poll(async () => ({
        classMarker: await body.evaluate((el) => el.classList.contains("tooltip-overlay-debug")),
        dataMarker: await body.getAttribute("data-feature-tooltip-overlay-debug")
      }))
      .toEqual({
        classMarker: true,
        dataMarker: "enabled"
      });

    const probeStyles = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.dataset.tooltipId = "test.probe";
      document.body.appendChild(probe);
      const styles = getComputedStyle(probe);
      const snapshot = {
        outlineStyle: styles.outlineStyle,
        outlineWidth: styles.outlineWidth
      };
      probe.remove();
      return snapshot;
    });

    expect(probeStyles.outlineStyle).toBe("dashed");
    expect(Number.parseFloat(probeStyles.outlineWidth || "0")).toBeGreaterThan(0);
  });

  test("removes overlay markers when disabled", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        tooltipOverlayDebug: false
      };
    });

    await page.goto("/src/pages/tooltipViewer.html");

    const body = page.locator("body");
    await expect
      .poll(async () => ({
        classMarker: await body.evaluate((el) => el.classList.contains("tooltip-overlay-debug")),
        dataMarker: await body.getAttribute("data-feature-tooltip-overlay-debug")
      }))
      .toEqual({
        classMarker: false,
        dataMarker: "disabled"
      });

    const disabledStyles = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.dataset.tooltipId = "test.probe";
      document.body.appendChild(probe);
      const styles = getComputedStyle(probe);
      const snapshot = {
        outlineStyle: styles.outlineStyle,
        outlineWidth: styles.outlineWidth
      };
      probe.remove();
      return snapshot;
    });
    expect(disabledStyles.outlineStyle).toBe("none");
    expect(Number.parseFloat(disabledStyles.outlineWidth || "0")).toBe(0);
  });
});
