# Investigation: readFileSync Not Available in jsdom Environment

## Executive Summary

Investigation into unit test failures in `tests/classicBattle/` revealed a Vitest/Vite configuration issue where Node.js `fs` module imports are externalized (blocked) in the jsdom environment for browser compatibility. This prevents `readFileSync()` calls at module load time, causing all affected tests to fail before any test logic runs.

**Status**: Analysis Complete - Awaiting Review of Proposed Fix

---

## Gemini's Analysis & Recommendations

**Overall Assessment**: This is a thorough and accurate investigation. The root cause analysis is correct, and the exploration of potential solutions is comprehensive.

**Recommendation**: **Strongly endorse Option A** from the original report (Deferred Reading with Graceful Fallback). This approach is the most idiomatic and robust solution for this Vitest/jsdom context. It correctly leverages the `beforeAll` hook to perform Node.js-dependent setup before the DOM-based tests run.

---

## Issue Description

### Failing Tests

- `tests/classicBattle/round-select.test.js`
- `tests/classicBattle/bootstrap.test.js`
- `tests/classicBattle/end-modal.test.js`
- `tests/classicBattle/quit-flow.test.js`
- `tests/classicBattle/round-selectFallback.test.js`
- `tests/classicBattle/init-complete.test.js`

### Error Message

```
TypeError: readFileSync is not a function
 ❯ tests/classicBattle/round-select.test.js:4:21
      2|
      3| // Read HTML file at module load time before any test runs and before …
      4| const htmlContent = readFileSync(`${process.cwd()}/src/pages/battleCla…
```

### Root Cause Details

Files in these test suites read HTML content at module load time using:

```javascript
import { readFileSync } from "node:fs";
const htmlContent = readFileSync(`${process.cwd()}/src/pages/battleClassic.html`, "utf-8");
```

However, Vitest's jsdom environment, powered by Vite, externalizes Node.js built-in modules like `fs` for browser compatibility. This means the import returns `undefined`, causing the `readFileSync` call to fail. This happens at the module-level before the jsdom environment is fully initialized. The core of the problem is a timing conflict: the tests need Node.js file access during setup, but require a browser-like DOM for execution.

---

## Recommended Fix Plan: Deferred Reading

The best solution is to defer reading the HTML file until after the environment is set up, using Vitest's lifecycle hooks. This ensures `fs` is available when needed without compromising the browser environment for the tests themselves.

### Refined Implementation

The proposed implementation in the original "Option A" was good, but can be simplified for clarity and robustness. The fallback logic within a `getHtmlContent` function is unnecessary and could mask setup issues. A cleaner pattern is to rely exclusively on the `beforeAll` hook for initialization and a `beforeEach` hook to set up the DOM.

**Simplified and Recommended Code for all affected test files:**

```javascript
// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { beforeAll, beforeEach, describe, test, expect } from "vitest";

let htmlContent;

beforeAll(() => {
  // This hook runs once before all tests in the file,
  // in an environment where `fs` is available.
  try {
    htmlContent = readFileSync(`${process.cwd()}/src/pages/battleClassic.html`, "utf-8");
  } catch (e) {
    console.error("Failed to read HTML file in beforeAll hook.", e);
    // Fail fast if the test setup is broken
    throw e;
  }
});

beforeEach(() => {
  // This hook runs before each test.
  // We check here to ensure the beforeAll hook succeeded.
  if (!htmlContent) {
    throw new Error("HTML content not loaded. Check the beforeAll hook.");
  }
  // Set up the DOM for the test
  document.body.innerHTML = htmlContent;
  // Any other per-test setup can go here
});


describe('Classic Battle DOM Tests', () => {
  test('should have a specific element available in the DOM', () => {
    // The DOM is now ready to be tested
    const element = document.querySelector('#some-element-id');
    expect(element).not.toBeNull();
  });

  // Add other tests here...
});
```

### Key Improvements in this Version

1.  **No Getter Function Needed**: The `htmlContent` variable is loaded once by `beforeAll` and is directly available to `beforeEach` for setting up the DOM.
2.  **Fail-Fast in `beforeEach`**: A check ensures that tests don't run with an empty or incorrect DOM if the `beforeAll` hook fails, making debugging more straightforward.
3.  **Simplified Logic**: This approach removes the need for a getter function with fallback logic, resulting in a cleaner and more maintainable test setup.

### Implementation Steps

1.  **Apply the pattern**: Update the six affected test files (`tests/classicBattle/*.test.js`) to use the `beforeAll` and `beforeEach` pattern shown above.
2.  **Remove Old Code**: Delete the top-level `readFileSync` call from each of the affected files.
3.  **Verify**: Run the battle tests (`npm run test:battles:classic`) to ensure all tests pass and the issue is resolved.
4.  **Regression Test**: Run the full test suite (`npm test`) to confirm no new issues have been introduced.

---

## Status

- [x] Root cause identified and verified.
- [x] Investigation documented.
- [x] Refined fix plan proposed.
- [ ] Awaiting approval to implement the fix.

**Next Action**: Proceed with implementation upon review and approval.
