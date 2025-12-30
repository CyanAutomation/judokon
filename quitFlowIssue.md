# Bug Report: `quitConfirmButtonPromise` is null in `quit-flow.test.js`

## 1. Summary

The `quit-flow.test.js` test is failing with an error indicating that `quitConfirmButtonPromise` is `null`. This appears to be related to a previously identified issue with `readFileSync` being externalized in the `jsdom` test environment. This issue was thought to be resolved but seems to have regressed.

The original report also mentioned an unrelated issue about `clearRoundCounter` being missing from a mock. This should be treated as a separate concern.

## 2. Analysis

The `quit-flow.test.js` test simulates a user clicking the "Quit" button and then awaits `window.quitConfirmButtonPromise`. This promise should be created and set on the `window` object by the `quitMatch` function in `src/helpers/classicBattle/quitModal.js` when the quit button's event handler is triggered.

The failure suggests that the event handler is not being correctly attached or triggered in the test environment. The likely root cause is how HTML content is loaded into `jsdom`.

A similar issue was documented in `progressBrowse.md`:

> **Bug**: Multiple test files in the `tests/classicBattle/` suite fail because they attempt to synchronously read an HTML file at the module level (`fs.readFileSync`). This fails because the `jsdom` test environment, configured globally in `vitest.config.js`, externalizes the Node.js `fs` module for browser compatibility, making `readFileSync` unavailable during module import.

The prescribed solution is to defer the `readFileSync` call until after `jsdom` is initialized.

## 3. Verification

An initial review of the test files mentioned in the original report was conducted:

- `tests/classicBattle/quit-flow.test.js`
- `tests/classicBattle/bootstrap.test.js`
- `tests/classicBattle/end-modal.test.js`

All three files **do** appear to correctly implement the deferred `readFileSync` pattern. This suggests either:
a) The regression is more subtle and lies elsewhere.
b) Other test files are still using the old, incorrect pattern, causing a knock-on effect.
c) There has been a change in the build/test configuration that has re-introduced the problem in a new way.

## 4. Recommendations for Improvement & Next Steps

To move forward with resolving this issue, the following steps are recommended:

1.  **Isolate the `clearRoundCounter` Issue**: Create a separate bug report or task to address the mock issue with `clearRoundCounter` to avoid confusion.

2.  **Comprehensive Code Audit**: Perform a full-text search across all `*.test.js` files in the repository for `readFileSync`. Any file that does not use the deferred loading pattern should be updated.
    ```bash
    grep -r "readFileSync" tests/**/*.test.js
    ```

3.  **Review Test Configuration**: Investigate the `vitest.config.js` and any related test setup files for recent changes that might affect module loading or externalization.

4.  **Improve Bug Report Formatting**: The current report is a single block of text. For clarity and better tracking, it is recommended to use structured markdown with sections like 'Summary', 'Analysis', and 'Recommendations'. This will make it easier for other developers to quickly understand the issue and the proposed solution.

By following these steps, we can systematically investigate the regression and ensure a robust, long-term fix.
