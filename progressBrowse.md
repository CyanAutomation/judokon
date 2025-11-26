# Bug Investigation: `readFileSync` Failures in `jsdom` Test Environment

## Executive Summary

**Status**: Investigation Complete. A consistent fix is ready for implementation.

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
