/**
 * Helper functions for replacing DOM state polling with direct Test API access
 */

/**
 * Wait for battle state using Test API instead of DOM polling
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} expectedState - The state to wait for
 * @param {object} options - Options object
 * @param {number} options.timeout - Timeout in ms (default: 5000)
 * @param {boolean} options.allowFallback - Allow DOM fallback if Test API unavailable (default: true)
 * @returns {Promise<void>}
 */
export async function waitForBattleState(page, expectedState, options = {}) {
  const { timeout = 5000, allowFallback = true } = options;
  
  // First check if Test API is available
  const hasTestAPI = await page.evaluate(() => {
    return typeof window.__TEST_API !== "undefined" && 
           window.__TEST_API.state && 
           typeof window.__TEST_API.state.getBattleState === "function";
  });

  if (hasTestAPI) {
    console.log(`⚡ Using Test API to wait for state: ${expectedState}`);
    // Use Test API for fast, direct state checking
    try {
      await page.waitForFunction(
        (state) => {
          const currentState = window.__TEST_API.state.getBattleState();
          return currentState === state;
        },
        expectedState,
        { timeout }
      );
      return;
    } catch (error) {
      console.log(`⚠️ Test API state check failed, current state:`, await page.evaluate(() => {
        return window.__TEST_API.state.getBattleState();
      }));
      if (!allowFallback) {
        throw error;
      }
    }
  }

  if (allowFallback) {
    console.log(`🔄 Falling back to DOM polling for state: ${expectedState}`);
    // Fallback to DOM polling if Test API unavailable or failed
    await page.waitForSelector(`[data-battle-state="${expectedState}"]`, { timeout });
  } else {
    throw new Error(`Test API not available and fallback disabled for state: ${expectedState}`);
  }
}

/**
 * Get current battle state using Test API or DOM fallback
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<string|null>} Current battle state
 */
export async function getCurrentBattleState(page) {
  return await page.evaluate(() => {
    if (window.__TEST_API && window.__TEST_API.state) {
      return window.__TEST_API.state.getBattleState();
    }
    // Fallback to DOM
    return document.body?.dataset?.battleState || null;
  });
}

/**
 * Trigger battle state transition using Test API
 * @param {import('@playwright/test').Page} page - Playwright page object  
 * @param {string} event - Event to trigger
 * @returns {Promise<boolean>} Success status
 */
export async function triggerStateTransition(page, event) {
  return await page.evaluate((eventName) => {
    if (window.__TEST_API && window.__TEST_API.state && window.__TEST_API.state.triggerStateTransition) {
      try {
        window.__TEST_API.state.triggerStateTransition(eventName);
        return true;
      } catch (error) {
        console.log('State transition failed:', error);
        return false;
      }
    }
    return false;
  }, event);
}
