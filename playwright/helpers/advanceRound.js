/**
 * Advance from roundOver to cooldown state by dispatching the continue event.
 *
 * This helper is useful for tests that disable autoContinue and need to manually
 * progress through rounds. It bypasses UI interactions and uses the Test API.
 *
 * @param {import('@playwright/test').Page} page - Playwright page instance
 * @returns {Promise<{success: boolean, error?: string, previousState?: string, nextState?: string}>}
 *
 * @example
 * await advanceRound(page);
 * await waitForBattleState(page, "cooldown");
 */
export async function advanceRound(page) {
  const result = await page.evaluate(() => {
    if (!window.__TEST_API?.state?.advanceRound) {
      return {
        success: false,
        error: "Test API unavailable: window.__TEST_API?.state?.advanceRound not found"
      };
    }

    return window.__TEST_API.state.advanceRound();
  });

  return result;
}

export default advanceRound;
