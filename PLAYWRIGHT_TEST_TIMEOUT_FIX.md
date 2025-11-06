# Playwright Test Timeout Fix: battle-cli-complete-round.spec.js

## Issue

The test `playwright/battle-cli-complete-round.spec.js` was timing out with the following error:

```text
Test timeout of 30000ms exceeded.
Error: page.goto: Test timeout of 30000ms exceeded.
Call log:
  - navigating to "http://localhost:5000/src/pages/battleClassic.html", waiting until "load"
```

This occurred in test #2: "completeRoundViaApi reports success when match ends on resolution" at line 19 in the `launchQuickClassicBattle()` function.

## Root Cause

The test file was importing `test` and `expect` directly from `@playwright/test`:

```javascript
import { test, expect } from "@playwright/test";
```

This bypassed the custom test fixture setup defined in `./fixtures/commonSetup.js`, which:

1. **Registers common routes** via `registerCommonRoutes(page)` - This is the critical missing piece
2. Clears localStorage and enables test-mode settings
3. Removes unexpected modal backdrops
4. Sets up proper console/error/request logging

The `registerCommonRoutes` function is responsible for mocking external CDN requests, including:

- **Sentry CDN**: `https://js-de.sentry-cdn.com/**` → Mocked with empty JS
- Google Fonts: `https://fonts.googleapis.com/**` and `https://fonts.gstatic.com/**` → Mocked with local fonts
- Flag CDN: `https://flagcdn.com/**` → Mocked with placeholder image
- Vendor CDN scripts (ajv, dompurify) → Mocked with local copies

## The Problem

Since `registerCommonRoutes` was never called, the **Sentry CDN script** (`https://js-de.sentry-cdn.com/d5c65640106080845226e89b9a1f589c.min.js`) referenced in `src/pages/battleClassic.html` was being fetched from the actual CDN.

On CI or slow network conditions, this CDN request can timeout, causing the entire `page.goto()` to exceed Playwright's default 30-second timeout because the page never completes loading.

The mockup in `commonSetup.js` handles this:

```javascript
page.route("https://js-de.sentry-cdn.com/**", (route) =>
  route.fulfill({
    contentType: "application/javascript",
    body: ""
  })
);
```

## Solution

Change the import statement from:

```javascript
import { test, expect } from "@playwright/test";
```

To:

```javascript
import { test, expect } from "./fixtures/commonSetup.js";
```

This ensures:

- ✅ All external CDN requests are mocked
- ✅ Test setup runs consistently
- ✅ Page loads quickly without CDN timeouts
- ✅ localStorage is properly initialized for tests
- ✅ Other test infrastructure is in place

## Files Changed

- `playwright/battle-cli-complete-round.spec.js` - Line 1: Updated import to use custom test fixture

## Verification

After this fix:

1. The Sentry CDN request will be mocked to return an empty script
2. The page.goto() will complete quickly
3. The test should pass within the normal timeout window

## Related Files

- `playwright/fixtures/commonSetup.js` - Defines the custom test fixture with route mocking
- `playwright/fixtures/commonRoutes.js` - Contains all the route mocking logic
- `src/pages/battleClassic.html` - References the Sentry CDN script that was causing the timeout

## Prevention

When creating new Playwright tests that navigate to pages with external resources:

1. Always import from `./fixtures/commonSetup.js` instead of `@playwright/test`
2. This ensures the custom fixtures and route mocking are applied
3. Check other test files for the correct import pattern as reference
