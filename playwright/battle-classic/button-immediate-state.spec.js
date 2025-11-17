import { test, expect } from "../fixtures/commonSetup.js";

test.describe("Classic Battle - Immediate Button State", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
      window.__TEST__ = true;
      window.process = window.process || {};
      window.process.env = { ...(window.process.env || {}), VITEST: "true" };
    });
    await page.goto("/src/pages/battleClassic.html");

    const mediumButton = page.getByRole("button", { name: "Medium" });
    const modalVisible = await mediumButton.isVisible().catch(() => false);
    if (modalVisible) {
      await mediumButton.click();
    }
  });

  test("check button state immediately before and during click", async ({ page }) => {
    const statButtons = page.getByTestId("stat-button");
    await expect(statButtons.first()).toBeEnabled();

    await expect
      .poll(() => page.evaluate(() => Boolean(window.__TEST_API?.state?.statButtons)))
      .toBeTruthy();

    await page.evaluate(() => window.__TEST_API?.state?.statButtons?.clearSnapshots?.());

    const getSnapshot = (phase) =>
      page.evaluate(
        (targetPhase) =>
          window.__TEST_API?.state?.statButtons?.getPhaseSnapshot?.(targetPhase) ?? null,
        phase
      );

    const waitForPhaseSnapshot = async (phase) => {
      await expect.poll(() => getSnapshot(phase)).toBeTruthy();
      return getSnapshot(phase);
    };

    const beforeSnapshotPromise = waitForPhaseSnapshot("beforeSelection");

    const firstButton = statButtons.first();
    await firstButton.scrollIntoViewIfNeeded();
    await firstButton.click({ force: true });

    const beforeSnapshot = await beforeSnapshotPromise;
    expect(beforeSnapshot).toMatchObject({
      disabled: false,
      hasDisabledAttr: false,
      hasDisabledClass: false
    });

    const duringSnapshot = await waitForPhaseSnapshot("duringSelection");
    expect(duringSnapshot).toMatchObject({
      disabled: true,
      hasDisabledAttr: true,
      hasDisabledClass: true
    });

    const afterSnapshot = await waitForPhaseSnapshot("afterSelection");
    expect(afterSnapshot).toMatchObject({
      disabled: true,
      hasDisabledAttr: true,
      hasDisabledClass: true
    });
  });
});
