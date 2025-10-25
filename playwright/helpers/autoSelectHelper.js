/**
 * Trigger the auto-select timeout path via the injected Test API.
 *
 * @param {import("@playwright/test").Page} page - Playwright page instance.
 * @returns {Promise<void>}
 */
export async function triggerAutoSelect(page) {
  const didTrigger = await page.evaluate(() => {
    try {
      return window.__TEST_API?.autoSelect?.triggerAutoSelect?.() ?? false;
    } catch {
      return false;
    }
  });

  if (!didTrigger) {
    throw new Error("Failed to trigger auto-select via Test API");
  }
}
