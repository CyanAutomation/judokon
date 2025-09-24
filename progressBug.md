# Investigation into Playwright Test Failures: round-select-keyboard.spec.js

## Issue Summary

The Playwright tests in `round-select-keyboard.spec.js` are failing with `TimeoutError: page.waitForSelector: Timeout 10000ms exceeded` when waiting for `.modal-backdrop` to be visible. This occurs despite the test setup attempting to force the round select modal to appear.

## Root Cause Analysis

1. **Test Setup**: The test sets `window.__FF_OVERRIDES = { showRoundSelectModal: true }` and `window.__TEST_MODE_ENABLED = false` to ensure the modal appears. It also clears localStorage and deletes `location.search` to prevent auto-start conditions.

2. **Code Path**:
   - `init()` calls `initRoundSelectModal(startCallback)`.
   - `resolveEnvironmentFlags()` detects `isPlaywright = true` and `showModalInTest = true` (from `__FF_OVERRIDES`).
   - `handleAutostartAndTestMode()` sets `bypassForTests = false` (since `showModalInTest` is true).
   - `shouldAutostart()` returns false (no `?autostart=1` in URL).
   - Therefore, the modal should be created and opened.

3. **Modal Creation and Positioning**:
   - `createRoundSelectModal()` creates the modal with title, instructions ("Use number keys (1-3) or arrow keys to select"), and buttons.
   - `RoundSelectPositioner` applies positioning relative to the `#cli-header` (which exists in `battleCLI.html`).
   - `modal.open()` removes the `hidden` attribute from `.modal-backdrop`.
   - The modal is appended to `document.body`.

4. **Potential Failure Points**:
   - **Visibility Issue**: The modal may be appended and not `hidden`, but not in the viewport due to positioning or headless browser constraints.
   - **CSS/Rendering**: In headless Playwright, the modal might not be rendered as "visible" if it's outside the viewport or affected by CSS.
   - **Timing**: The test waits immediately after `page.goto()`, but JS execution might not have completed modal opening.
   - **Error in Modal Code**: If `t("modal.roundSelect.title")` fails (translation missing), or other errors, the modal creation might fail silently, but the code has try-catch in `init()`.
   - **Positioning Off-Screen**: `updateInset()` sets `--modal-inset-top` to header height, but if the page height is small in headless mode, the modal could be below the fold.

5. **Why Unit Tests Pass**: Unit tests mock DOM and don't rely on actual rendering/visibility.

## Proposed Approach to Fixing

1. **Debug the Test Environment**:
   - Add `await page.screenshot({ path: 'modal-debug.png' })` before the wait to capture the page state.
   - Add `console.log` in `initRoundSelectModal` to confirm it's called and modal is opened.
   - Check if `.modal-backdrop` exists in DOM but is not visible (e.g., via `page.locator('.modal-backdrop').isVisible()`).

2. **Adjust Test Selector/Wait**:
   - Change `await page.waitForSelector(".modal-backdrop", { state: "visible" })` to `await page.waitForSelector(".round-select-instructions")` or `.modal` to wait for content inside the modal.
   - Add `await page.waitForLoadState('domcontentloaded')` or `'networkidle'` after `page.goto()` to ensure JS has run.

3. **Fix Positioning for Tests**:
   - Modify `RoundSelectPositioner.updateInset()` to set a fixed top position (e.g., `10px`) in test environments if header height is zero or modal is off-screen.
   - Or ensure the test page has sufficient height: `await page.setViewportSize({ width: 1280, height: 1024 })`.

4. **Robust Modal Fallback**:
   - In `init()`, if `initRoundSelectModal` throws or modal is not visible after opening, log an error and ensure `renderStartButton` is called.
   - Add a check in the test: if modal doesn't appear, verify the start button is shown.

5. **Test Isolation**:
   - Ensure no other modals (e.g., quit modal) are interfering.
   - Clear any residual modal elements before the test.

## Next Steps

- Implement debug logging and screenshot in the test.
- Update the wait selector to something more reliable.
- If issues persist, adjust positioning logic for headless environments.

This investigation suggests the issue is environmental (headless rendering) rather than code logic, as the modal creation path should work based on the flags.
