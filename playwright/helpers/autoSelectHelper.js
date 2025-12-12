/**
 * Trigger the auto-select timeout path via the injected Test API.
 *
 * This helper bridges Playwright E2E tests with the battle engine's auto-select timeout
 * mechanism, allowing tests to force the progression from stat selection to round decision.
 *
 * @pseudocode
 * 1. Evaluate code in the browser context via page.evaluate
 * 2. Access the Test API's auto-select module at window.__TEST_API?.autoSelect?.triggerAutoSelect
 * 3. Call triggerAutoSelect with awaitCompletion: false to allow Playwright to continue
 *    independently while the battle engine progresses asynchronously
 * 4. Use optional chaining (?.) for safe property access with null coalescing (??) fallback to false
 * 5. Catch any exceptions (API missing, serialization errors, timeouts) and capture error details
 * 6. Return structured result {success, error} indicating success or failure with context
 *
 * @param {import("@playwright/test").Page} page - Playwright page instance.
 * @returns {Promise<{success: boolean, error?: string}>} Result object with success flag and optional error message.
 *          On success: {success: true}
 *          On failure: {success: false, error: "descriptive error message"}
 */
export async function triggerAutoSelect(page) {
  try {
    const didTrigger = await page.evaluate(async () => {
      try {
        return (
          // Use awaitCompletion: false to allow Playwright tests to continue
          // awaiting roundOver state independently after timeout transition
          (await window.__TEST_API?.autoSelect?.triggerAutoSelect?.({ awaitCompletion: false })) ??
          false
        );
      } catch (innerError) {
        // Return error details to Playwright context
        return {
          _error: true,
          message: innerError instanceof Error ? innerError.message : String(innerError)
        };
      }
    });

    // Check if browser context returned an error
    if (didTrigger?._error) {
      return {
        success: false,
        error: `Test API threw an error: ${didTrigger.message}`
      };
    }

    // Check if API call succeeded
    if (!didTrigger) {
      return {
        success: false,
        error: "Test API unavailable: window.__TEST_API?.autoSelect?.triggerAutoSelect not found"
      };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to trigger auto-select via Test API: ${errorMessage}`
    };
  }
}
