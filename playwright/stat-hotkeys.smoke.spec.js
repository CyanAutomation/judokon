import { test, expect } from "./fixtures/commonSetup.js";
import { configureApp } from "./fixtures/appConfig.js";
import { waitForFeatureFlagOverrides } from "./helpers/featureFlagHelper.js";

async function launchClassicBattle(page, featureFlags) {
  const app = await configureApp(page, { featureFlags });
  if (featureFlags && Object.keys(featureFlags).length > 0) {
    await page.addInitScript((flags) => {
      const existing = typeof window.__FF_OVERRIDES === "object" ? window.__FF_OVERRIDES : {};
      window.__FF_OVERRIDES = { ...existing, ...flags };
    }, featureFlags);
  }
  await page.goto("/index.html");
  // Feature flag verification is handled in individual tests
  await app.applyRuntime();

  await Promise.all([
    page.waitForURL("**/battleClassic.html"),
    (async () => {
      const startBtn =
        (await page.$('[data-testid="start-classic"]')) ||
        (await page.getByText("Classic Battle").first());
      await startBtn.click();
    })()
  ]);

  const statButtons = page.getByTestId("stat-button");
  const firstStat = statButtons.first();
  const statCount = await statButtons.count();
  expect(statCount).toBeGreaterThan(0);
  await expect(firstStat).toBeVisible();
  await expect(page.getByTestId("stat-buttons")).toHaveAttribute(
    "data-buttons-ready",
    "true"
  );

  return {
    app,
    firstStat,
    statButtons,
    nextButton: page.getByTestId("next-button"),
    roundMessage: page.locator("header #round-message"),
    scoreDisplay: page.getByTestId("score-display")
  };
}

test.describe("Classic Battle – stat hotkeys", () => {
  test("pressing '1' resolves the round when statHotkeys is enabled", async ({ page }) => {
    const { app, nextButton, roundMessage, scoreDisplay } = await launchClassicBattle(page, {
      statHotkeys: true
    });

    await waitForFeatureFlagOverrides(page, { statHotkeys: true });

    try {
      // Non-hotkey input should be ignored while waiting for a valid stat press
      await page.focus("body");
      await page.keyboard.press("KeyA");
      await expect(roundMessage).toHaveText(/^\s*$/, { timeout: 1000 });
      await expect(nextButton).toBeDisabled();

      // Pressing 1 should pick the first stat and resolve the round
      await expect(scoreDisplay.locator('[data-side="player"]')).toHaveText(/You:\s*0/);
      await expect(scoreDisplay.locator('[data-side="opponent"]')).toHaveText(/Opponent:\s*0/);
      await page.keyboard.press("Digit1");

      await expect(roundMessage).toContainText(/You picked: /, { timeout: 5000 });
      const roundText = await roundMessage.textContent();
      expect(roundText).toMatch(
        /Opponent picked: .* — (You win the round!|Opponent wins the round!|Tie)/
      );
      await expect(nextButton).toBeEnabled();
      await expect(nextButton).toHaveAttribute("data-next-ready", "true");
    } finally {
      await app.cleanup();
    }
  });

  test("keyboard hotkeys stay disabled when the flag is off", async ({ page }) => {
    const { app, firstStat, nextButton, roundMessage, scoreDisplay } =
      await launchClassicBattle(page, { statHotkeys: false });

    await waitForFeatureFlagOverrides(page, { statHotkeys: false });

    try {
      await page.focus("body");
      await page.keyboard.press("Digit1");

      await expect(roundMessage).toHaveText(/^\s*$/);
      await expect(scoreDisplay.locator('[data-side="player"]')).toHaveText(/You:\s*0/);
      await expect(scoreDisplay.locator('[data-side="opponent"]')).toHaveText(/Opponent:\s*0/);
      await expect(firstStat).toBeEnabled();
      await expect(nextButton).toBeDisabled();
    } finally {
      await app.cleanup();
    }
  });

  test("ignores invalid numeric keys even when statHotkeys is enabled", async ({ page }) => {
    const { app, firstStat, nextButton, roundMessage } = await launchClassicBattle(page, {
      statHotkeys: true
    });

    await waitForFeatureFlagOverrides(page, { statHotkeys: true });

    try {
      await page.focus("body");
      await page.keyboard.press("Digit9");

      await expect(roundMessage).toHaveText(/^\s*$/);
      await expect(firstStat).toBeEnabled();
      await expect(nextButton).toBeDisabled();

      await page.keyboard.press("Digit1");
      await expect(roundMessage).toContainText(/You picked: /, { timeout: 5000 });
      await expect(nextButton).toHaveAttribute("data-next-ready", "true");
    } finally {
      await app.cleanup();
    }
  });
});
