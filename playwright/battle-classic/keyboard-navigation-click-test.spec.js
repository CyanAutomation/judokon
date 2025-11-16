import { test, expect } from "../fixtures/commonSetup.js";
test.describe("Classic Battle - Manual Click Test", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
      window.__TEST__ = true;
      window.process = window.process || {};
      window.process.env = { ...(window.process.env || {}), VITEST: "true" };
      (async () => {
        try {
          await import("/src/helpers/classicBattle/statButtonTestSignals.js");
        } catch {}
      })();
    });
    await page.goto("/src/pages/battleClassic.html");

    // The sticky battle status header overlaps the stat buttons in this
    // viewport, so disable its pointer events to allow natural clicks.
    await page.addStyleTag({
      content: `
        header.header,
        .battle-status-metrics,
        .battle-status-header {
          pointer-events: none !important;
        }
      `
    });

    await page.evaluate(async () => {
      if (!window.__TEST_API?.statButtons?.waitForHandler) {
        try {
          const mod = await import("/src/helpers/classicBattle/statButtonTestSignals.js");
          const factory = typeof mod?.createStatButtonTestApi === "function"
            ? mod.createStatButtonTestApi
            : null;
          const root = window.__TEST_API || (window.__TEST_API = {});
          if (factory && !root.statButtons) {
            root.statButtons = factory();
          }
        } catch (error) {
          console.warn("statButtonTestSignals import failed", error);
        }
      }
    });
    await page.waitForFunction(() => !!window.__TEST_API?.statButtons?.waitForHandler, {
      timeout: 5_000
    });

    // Start the match via modal when it is present in this build
    const mediumButton = page.getByRole("button", { name: "Medium" });
    const mediumVisible = await mediumButton.isVisible().catch(() => false);
    if (mediumVisible) {
      await mediumButton.click();
    }

  });

  test("programmatic click works", async ({ page }) => {
    // Wait for stat buttons to be enabled
    const statButtons = page.getByTestId("stat-button");
    await expect(statButtons.first()).toBeEnabled();

    // Programmatically click the first button
    await statButtons.first().click();

    const handlerEvent = await page.evaluate(async () => {
      return await window.__TEST_API?.statButtons?.waitForHandler?.({ timeout: 2000 });
    });
    expect(handlerEvent).toBeTruthy();
    expect(handlerEvent?.timedOut).toBeFalsy();

    const disableEvent = await page.evaluate(async (afterId) => {
      return await window.__TEST_API?.statButtons?.waitForDisable?.({ timeout: 2000, afterId });
    }, handlerEvent?.id ?? null);
    expect(disableEvent).toBeTruthy();
    expect(disableEvent?.timedOut).toBeFalsy();

    expect(disableEvent?.detail?.count ?? 0).toBeGreaterThan(0);
    expect(Array.isArray(disableEvent?.detail?.stats)).toBeTruthy();
    expect(disableEvent?.detail?.stats ?? []).toContain(handlerEvent?.detail?.stat ?? null);
  });

  test("playwright click() works", async ({ page }) => {
    // Wait for stat buttons to be enabled
    const statButtons = page.getByTestId("stat-button");
    await expect(statButtons.first()).toBeEnabled();
    // Use Playwright's click method
    await statButtons.first().click();

    const handlerEvent = await page.evaluate(async () => {
      return await window.__TEST_API?.statButtons?.waitForHandler?.({ timeout: 2000 });
    });
    expect(handlerEvent).toBeTruthy();
    expect(handlerEvent?.timedOut).toBeFalsy();

    const disableEvent = await page.evaluate(async (afterId) => {
      return await window.__TEST_API?.statButtons?.waitForDisable?.({ timeout: 2000, afterId });
    }, handlerEvent?.id ?? null);
    expect(disableEvent).toBeTruthy();
    expect(disableEvent?.timedOut).toBeFalsy();

    expect(disableEvent?.detail?.count ?? 0).toBeGreaterThan(0);
    expect(Array.isArray(disableEvent?.detail?.stats)).toBeTruthy();
    expect(disableEvent?.detail?.stats ?? []).toContain(handlerEvent?.detail?.stat ?? null);
  });
});
