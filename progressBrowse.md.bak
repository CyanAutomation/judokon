# Investigation: readFileSync Not Available in jsdom Environment

## Executive Summary

Investigation into unit test failures in `tests/classicBattle/` revealed a Vitest/Vite configuration issue where Node.js `fs` module imports are externalized (blocked) in jsdom environment for browser compatibility. This prevents `readFileSync()` calls at module load time, causing all affected tests to fail before any test logic runs.

**Status**: Investigation Complete - Awaiting Review

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

### Root Cause

Files in these test suites read HTML content at module load time using:

```javascript
import { readFileSync } from "node:fs";
const htmlContent = readFileSync(`${process.cwd()}/src/pages/battleClassic.html`, "utf-8");
```

However:

1. **Vitest's jsdom environment** (configured in `vitest.config.js` with `environment: "jsdom"`) automatically externalizes Node.js modules for browser compatibility
2. **Vite's module resolution** intercepts `fs`/`node:fs` imports and returns `undefined` in jsdom context, making `readFileSync` unavailable
3. **Module-level execution** happens before jsdom environment is fully initialized, so the import fails before any test can run

This is a **configuration mismatch**: tests need both:

- **Node.js file system access** (to read HTML files during setup)
- **jsdom DOM APIs** (to test DOM manipulation code)

---

## Investigation Timeline

### Step 1: Initial Analysis

- Identified module-level `readFileSync` call at line 4 of `round-select.test.js`
- Import pattern: `import { readFileSync } from "node:fs"`
- Error occurs before any test executes

### Step 2: Root Cause Analysis

- Checked Vitest configuration: `environment: "jsdom"` is set globally
- Confirmed Vite is externalizing `node:fs` for browser compatibility (warning in output):

  ```
  Module "node:fs" has been externalized for browser compatibility
  ```

- Identified pattern: All affected files moved to module-level file reading in recent commit `0b0f417ac` ("Refactor integration tests to read HTML file directly")
- Previous approach (per-test reading) worked; centralized module-level reading broke it

### Step 3: Solution Research

- Discovered Vitest feature: `@vitest-environment` comment directive allows per-file environment override
- Found that changing to `@vitest-environment node` breaks tests needing `document` global
- Identified that jsdom environment needs special handling for Node APIs

### Step 4: Attempted Solutions

#### Attempt 1: Node Environment Override

```javascript
// @vitest-environment node
```

**Result**: ❌ Failed - `document` undefined in Node environment; tests need both

#### Attempt 2: Deferred Reading with JSDOM Helper

- Create custom `setupDom()` function
- Use `beforeAll()` hook for initialization
- Manually assign window/document to globals
**Result**: ❌ Failed - Created cascade of environment setup issues; incompatible with existing test infrastructure expecting jsdom globals

#### Attempt 3: Using beforeAll() in jsdom

```javascript
beforeAll(() => {
  if (!htmlContent) {
    htmlContent = readFileSync(`${process.cwd()}/src/pages/battleClassic.html`, "utf-8");
  }
});
```

**Result**: 🔄 In Progress - `beforeAll()` runs after environment setup, but `readFileSync` still externalized in jsdom

---

## Root Cause Details

### The Core Problem

Vitest's jsdom environment uses Vite's module resolution, which:

1. **For module-level code**: Vite runs transform before jsdom is initialized
2. **For externalized modules**: Returns `undefined` instead of actual module
3. **For Node.js APIs**: Explicitly blocks `fs`, `path`, `os`, etc. in jsdom for browser safety

This creates a **timing conflict**:

- ✅ Module code runs immediately on import
- ❌ jsdom environment isn't fully initialized yet
- ❌ Node APIs are externalized for browser safety

### Why Recent Change Broke Tests

Commit `0b0f417ac` refactored tests to read HTML at module level to:

- Avoid `vi.resetModules()` clearing cached content
- Ensure consistent HTML across test runs

However, this created the externalization problem:

- **Before**: HTML read inside `beforeEach()` → worked (though had other issues)
- **After**: HTML read at module level → fails (externalization blocks it)

---

## Suspected Fix Plan

### Option A: Deferred Reading with Graceful Fallback (RECOMMENDED)

**Approach**: Use `beforeAll()` hook to defer reading, with try-catch for externalization

```javascript
// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { beforeAll } from "vitest";

let htmlContent;

beforeAll(() => {
  if (!htmlContent) {
    try {
      htmlContent = readFileSync(`${process.cwd()}/src/pages/battleClassic.html`, "utf-8");
    } catch (err) {
      console.error("Failed to read HTML in beforeAll:", err);
      throw err;
    }
  }
});

function getHtmlContent() {
  if (!htmlContent) {
    // Fallback: try to read if beforeAll hasn't run
    return readFileSync(`${process.cwd()}/src/pages/battleClassic.html`, "utf-8");
  }
  return htmlContent;
}

describe(...){
  test(...){
    document.documentElement.innerHTML = getHtmlContent();
    ...
  }
}
```

**Pros**:

- ✅ Keeps jsdom environment (all tests run in browser-like context)
- ✅ Allows Node.js API access in `beforeAll()` (runs in different context)
- ✅ Minimal changes to test structure
- ✅ Compatible with existing `vi.resetModules()`
- ✅ Works with global test setup infrastructure

**Cons**:

- ⚠️ Requires testing in beforeAll timing
- ⚠️ May need adjustment if other tests have similar patterns

**Files Affected**:

- `tests/classicBattle/round-select.test.js`
- `tests/classicBattle/bootstrap.test.js`
- `tests/classicBattle/end-modal.test.js`
- `tests/classicBattle/quit-flow.test.js`
- `tests/classicBattle/round-selectFallback.test.js`
- `tests/classicBattle/init-complete.test.js`

---

### Option B: Extract to Helper Module (ALTERNATIVE)

Create a shared module that exports pre-loaded HTML, bypassing the externalization:

```javascript
// tests/classicBattle/testFixtures.mjs (Node environment)
import { readFileSync } from "node:fs";

export const battleClassicHtml = readFileSync(
  `${process.cwd()}/src/pages/battleClassic.html`,
  "utf-8"
);
```

```javascript
// tests/classicBattle/round-select.test.js (jsdom)
import { battleClassicHtml } from "./testFixtures.mjs";

describe(...){
  test(...){
    document.documentElement.innerHTML = battleClassicHtml;
    ...
  }
}
```

**Pros**:

- ✅ Cleaner separation of concerns
- ✅ Shared fixture for all tests

**Cons**:

- ❌ Creates new file (more complex)
- ❌ Module still needs Node environment to load
- ❌ May not work if jsdom environment blocks ES module loading

---

### Option C: Use Vitest Configuration Extension

Add a test fixture that runs in Node environment:

```javascript
// vitest.config.js
export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.js", "./tests/fixtures/loadHtmlFixtures.mjs"],
    // ...
  }
});
```

Make `loadHtmlFixtures.mjs` run in Node environment and expose globals.

**Pros**:

- ✅ Centralized handling
- ✅ No changes to individual test files

**Cons**:

- ❌ Complex configuration
- ❌ May introduce other side effects
- ❌ Hard to debug

---

## Recommended Path Forward

**PRIMARY**: Implement **Option A** (Deferred Reading with Graceful Fallback)

**Reasoning**:

1. Minimal changes needed (6 test files)
2. Preserves jsdom environment (important for test authenticity)
3. Clear error handling for debugging
4. No new files or complex configuration
5. Aligns with Vitest best practices for mixed-environment needs

**Implementation Steps**:

1. ✅ Complete - Added `@vitest-environment jsdom` directives to all affected files
2. 🔄 In Progress - Add `beforeAll()` hook for deferred HTML reading
3. ⏳ Pending - Replace module-level `readFileSync()` with `getHtmlContent()` function calls
4. ⏳ Pending - Test all 6 test files to verify fixes
5. ⏳ Pending - Run full test suite (`npm run test:battles`) to confirm no regressions

---

## Related Context

### Previous Work

- Fix for `startRoundCycle` error handling: Commit `1806705dc`
  - Re-throws `JudokaDataLoadError` for proper cleanup
  - Separate from this jsdom issue but affects same test file

### Configuration Files

- `vitest.config.js`: Sets `environment: "jsdom"` globally
- `tests/setup.js`: Global test setup (runs after environment initialization)
- `src/pages/battleClassic.html`: HTML fixture being read

### Vitest Directives Reference

```javascript
// @vitest-environment jsdom  (default)
// @vitest-environment node   (Node.js runtime)
// @vitest-environment happy-dom  (lighter alternative to jsdom)
```

---

## Status

- [x] Root cause identified
- [x] Investigation documented
- [ ] Fix implemented and tested
- [ ] Full test suite passing
- [ ] PR ready for merge

**Next Action**: Await review before proceeding with implementation
