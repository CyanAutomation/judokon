import { test, expect } from "../fixtures/commonSetup.js";
import { waitForBattleState } from "../helpers/battleStateHelper.js";

const SPEC_PATH = "design/productRequirementsDocuments/prdBattleClassic.md";

test.describe("Cooldown countdown display", () => {
  test(`[Spec: ${SPEC_PATH}] shows cooldown countdown promptly and resets for the next round`, async ({
    page
  }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
    });
    
    await page.goto("/src/pages/battleClassic.html");

    // Wait for modal and select difficulty
    await expect(page.getByRole("button", { name: "Medium" })).toBeVisible();
    await page.getByRole("button", { name: "Medium" }).click();

    // Wait for stat buttons to be ready
    await waitForBattleState(page, "waitingForPlayerAction");

    // Click any stat to trigger selection flow
    await page
      .getByRole("button", { name: /power|speed|technique|kumikata|newaza/i })
      .first()
      .click();

    // Wait for cooldown state after selection
    await waitForBattleState(page, "cooldown");

    // Verify the next-round-timer element shows the countdown
    // The cooldown renderer updates both the snackbar and the timer display
    // Note: The snackbar may show other messages like "Opponent is choosing..." or
    // "First to 5 points wins." during transitions, but the timer element reliably
    // shows the countdown value.
    const timer = page.getByTestId("next-round-timer");
    const parseTimerValue = async () => {
      const text = (await timer.textContent()) || "";
      const match = text.match(/Time Left:\s*(\d+)s/i);
      return match ? Number.parseInt(match[1], 10) : null;
    };

    await expect(timer).toBeVisible();
    const countdownStartedAt = Date.now();
    await expect(timer).toContainText(/Time Left:\s*\d+s/, { timeout: 2_000 });
    const countdownDelayMs = Date.now() - countdownStartedAt;
    expect(countdownDelayMs).toBeLessThan(2_000);

    const cooldownValue = await parseTimerValue();
    expect(cooldownValue).not.toBeNull();

    const nextButton = page.getByTestId("next-button");
    await expect(nextButton).toHaveAttribute("data-next-ready", "true", { timeout: 10_000 });

    await nextButton.click();
    await waitForBattleState(page, "waitingForPlayerAction");

    await expect(timer).toContainText(/Time Left:\s*\d+s/, { timeout: 5_000 });
    const selectionValue = await parseTimerValue();
    expect(selectionValue).not.toBeNull();
    expect(/** @type {number} */ (selectionValue)).toBeGreaterThanOrEqual(
      /** @type {number} */ (cooldownValue)
    );
  });

  test(`[Spec: ${SPEC_PATH}] does not show cooldown countdown snackbar during opponent selection`, async ({
    page
  }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
    });
    
    await page.goto("/src/pages/battleClassic.html");

    // Wait for modal and select difficulty
    await expect(page.getByRole("button", { name: "Medium" })).toBeVisible();
    await page.getByRole("button", { name: "Medium" }).click();

    // Wait for stat buttons to be ready
    await waitForBattleState(page, "waitingForPlayerAction");

    // Click stat to trigger opponent selection phase
    await page
      .getByRole("button", { name: /power|speed|technique|kumikata|newaza/i })
      .first()
      .click();

    // Wait briefly for roundDecision state
    await waitForBattleState(page, "roundDecision");

    // Get snackbar element
    const snackbar = page.locator("#snackbar-container .snackbar");

    // Verify snackbar exists (should show "Opponent is choosing..." or similar)
    await expect(snackbar).toBeVisible({ timeout: 2_000 });

    // Verify the snackbar does NOT contain countdown text during opponent selection
    const snackbarText = await snackbar.textContent();
    expect(snackbarText).not.toMatch(/Next round in:/i);
    expect(snackbarText).not.toMatch(/Time Left:/i);

    // But the timer display should still work
    const timer = page.getByTestId("next-round-timer");
    
    // Wait for cooldown state
    await waitForBattleState(page, "cooldown");

    // Now verify timer display is working (independently of snackbar)
    await expect(timer).toBeVisible();
    await expect(timer).toContainText(/Time Left:\s*\d+s/, { timeout: 2_000 });
  });
});
