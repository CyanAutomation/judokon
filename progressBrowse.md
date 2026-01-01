# Bug Investigation: `readFileSync` Failures in `jsdom` Test Environment

## Executive Summary

**Status**: Investigation Complete. Implementation of the consistent fix is **In Progress**.

**Bug**: Multiple test files in the `tests/classicBattle/` suite fail because they attempt to synchronously read an HTML file at the module level (`fs.readFileSync`). This fails because the `jsdom` test environment, configured globally in `vitest.config.js`, externalizes the Node.js `fs` module for browser compatibility, making `readFileSync` unavailable during module import.

**Analysis**: The investigation in the original `.bak` file was accurate. While some files have been partially patched with a lazy-loading getter, the solution is inconsistent. The most robust solution, as identified in the original report, is to defer file reading to a `beforeAll` hook, which runs in a context where Node.js APIs are accessible. This approach should be standardized across all affected files.

---

## Proposed Fix Plan: Standardize Deferred HTML Loading

The goal is to apply a consistent, best-practice pattern to all affected test files. We will use a `beforeAll` hook to load the HTML content, ensuring it's available before any tests run without blocking module initialization.

### Step 1: Apply Standard `beforeAll` Pattern to All Affected Files

The following files need to be updated to use the standardized deferred loading pattern.

**Affected Files:**

- `tests/classicBattle/round-select.test.js`
- `tests/classicBattle/bootstrap.test.js`
- `tests/classicBattle/end-modal.test.js`
- `tests/classicBattle/quit-flow.test.js`
- `tests/classicBattle/round-selectFallback.test.js`
- `tests/classicBattle/init-complete.test.js`

**Standard Code to Apply:**

Replace any existing module-level `readFileSync` or lazy-getter functions in the files above with the following standardized code block at the top of each file:

```javascript
// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { beforeAll, beforeEach } from "vitest";

// Defer reading HTML file until beforeAll runs (after environment is fully set up)
let htmlContent;

beforeAll(() => {
  if (!htmlContent) {
    try {
      htmlContent = readFileSync(`${process.cwd()}/src/pages/battleClassic.html`, "utf-8");
    } catch (err) {
      console.error("Failed to read battle HTML:", err);
      throw err;
    }
  }
});

// In each test, or in a beforeEach, set the document body:
beforeEach(() => {
  document.body.innerHTML = htmlContent;
});
```

_Note: If a `beforeEach` hook already exists, add `document.body.innerHTML = htmlContent;` to it rather than creating a new one._

### Step 2: Verify the Fixes

After applying the changes to all 6 files, run the classic battle test suite to confirm that all tests now pass.

```bash
npm run test:battles:classic
```

### Step 3: Run Full Regression Test

Ensure that the standardized fix has not introduced any regressions elsewhere.

```bash
npm run test
```

This approach ensures consistency, resolves the `readFileSync` error reliably, and aligns with best practices for managing test fixtures in a `jsdom` environment.

---

## Implementation Log

This log tracks the progress of applying the standardized deferred HTML loading pattern to the affected files.

| File                                               | Status                    | Notes                                                                                                                                                                                                                                                                                                        |
| :------------------------------------------------- | :------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/classicBattle/round-select.test.js`         | ⚠️ Partially Migrated     | `beforeAll` hook is present, but `document.documentElement.innerHTML = getHtmlContent();` is called inside `test` blocks instead of `document.body.innerHTML = htmlContent;` in `beforeEach`. Still uses `getHtmlContent()` helper.                                                                          |
| `tests/classicBattle/bootstrap.test.js`            | ❌ Not Yet Migrated       | Still uses module-level lazy-loading getter (`getBattleClassicHtml()`) and `readFileSync`. Does not use `beforeAll`.                                                                                                                                                                                         |
| `tests/classicBattle/end-modal.test.js`            | ❌ Not Yet Migrated       | Still uses module-level lazy-loading getter (`getHtmlContent()`) and `readFileSync`. Does not use `beforeAll`.                                                                                                                                                                                               |
| `tests/classicBattle/quit-flow.test.js`            | ❌ Not Yet Migrated       | Still uses module-level lazy-loading getter (`getHtmlContent()`) and `readFileSync`. Does not use `beforeAll`.                                                                                                                                                                                               |
| `tests/classicBattle/round-selectFallback.test.js` | ❌ Not Yet Migrated       | Still uses module-level lazy-loading getter (`getBattleClassicHtml()`) and `readFileSync`. Does not use `beforeAll`.                                                                                                                                                                                         |
| `tests/classicBattle/init-complete.test.js`        | ✅ Environment is Node.js | This file uses `@vitest-environment node`, not `jsdom`, and sets up JSDOM manually within `beforeEach`. The `progressBrowse.md` fix is targeted at `jsdom` environments externalizing `fs`. While it uses `readFileSync`, it's not directly subject to the `jsdom` externalization issue this fix addresses. |

---

## Opportunities for Improvement

1.  **Complete Migration**: Systematically apply the proposed `beforeAll` pattern to all files currently marked as "❌ Not Yet Migrated" or "⚠️ Partially Migrated".
2.  **Standardize `beforeEach` HTML Injection**: Ensure that `document.body.innerHTML = htmlContent;` is consistently used within a `beforeEach` hook across all migrated files, as described in the "Standard Code to Apply".
3.  **Remove Redundant Helpers**: Once `beforeAll` and `beforeEach` are correctly implemented, remove any leftover `getHtmlContent()` or `getBattleClassicHtml()` helper functions that use `readFileSync` at the module level.
4.  **Consider `init-complete.test.js`**: While not directly affected by the `jsdom` externalization, consider if `init-complete.test.js` could also benefit from a more standardized HTML loading mechanism for consistency, perhaps adapting the `beforeAll` pattern to its manual JSDOM setup.
5.  **Refine Verification Steps**: Once all files are migrated, execute `npm run test:battles:classic` and `npm run test` to confirm full resolution and lack of regressions.
