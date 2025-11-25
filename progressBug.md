# Bug Investigation Report: DOM Access in Test Environment

## Executive Summary

**Status**: Investigation Complete. Root cause identified. Ready for implementation.

**Bug**: Components fail to render in JSDOM test environments because they cannot access the global `document` object when instantiated from event handlers during battle initialization. This prevents the UI from rendering and blocks tests.

**Root Cause**: The `getDocumentRef()` helper in `src/helpers/documentHelper.js` correctly attempts to find the `document` object. However, when a component like `Card.js` is created from an event handler deep in the initialization sequence, the execution context does not have access to the `global.document` that was set up by the test's `beforeEach` hook. The current implementation of `getDocumentRef` isn't robust enough to handle this specific scenario.

**Solution**: We will make `getDocumentRef` more robust by adding a fallback that caches the document reference in a shared, module-level variable the first time it's successfully accessed. This ensures that even if the immediate `global` or `window` is not available in a specific execution context, the helper can still provide the correct document reference from its cache.

---

## Proposed Fix Plan

### Step 1: Enhance `getDocumentRef` to Cache the Document

Modify `src/helpers/documentHelper.js` to cache the document reference.

1.  Introduce a module-level variable `docRef` initialized to `null`.
2.  In `getDocumentRef()`, if `docRef` is already set, return it immediately.
3.  If `docRef` is not set, perform the existing checks (`document`, `globalThis.document`, etc.).
4.  If a `document` object is found, store it in `docRef` before returning it.

This change will make the helper resilient to context--switching issues.

**Example Implementation:**

```javascript
// In src/helpers/documentHelper.js

let docRef = null;

export function getDocumentRef() {
  if (docRef) {
    return docRef;
  }

  // Try direct document reference
  try {
    if (typeof document !== "undefined" && document) {
      docRef = document;
      return docRef;
    }
  } catch {
    // Ignore
  }

  // Try globalThis.document
  try {
    if (globalThis && globalThis.document) {
      docRef = globalThis.document;
      return docRef;
    }
  } catch {
    // Ignore
  }
  
  // ... other fallbacks

  return null;
}
```

### Step 2: Add a Reset Function for Tests

To ensure test isolation, we need a way to reset the cached `docRef` between tests.

1.  In `src/helpers/documentHelper.js`, export a new function `__resetDocumentRef` that sets `docRef` back to `null`. This function should be clearly marked as a `test-only` helper.
2.  In the `afterEach` hook of the relevant test files (e.g., `tests/integration/battleClassic.integration.test.js`), call `__resetDocumentRef()` to clean up.

### Step 3: Verify the Fix

Run the integration tests that were previously failing due to this issue.

```bash
npm run test:battles:classic
```

All tests, particularly those in `tests/integration/battleClassic.integration.test.js`, should now pass as the components will be able to correctly access the `document` object and render.

---
## Previous Investigation (Completed)

The initial bug concerning the state machine in `stateManager.js` (passing an array instead of a Map) has been fixed and verified. The current `document` reference issue was discovered during the investigation of the original bug's test failures.