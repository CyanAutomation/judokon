# Playwright Homepage Specs

| Spec file | Responsibilities |
|-----------|------------------|
| `homepage.spec.js` | Verifies footer navigation link visibility, ordering, and other interactive elements. |
| `homepage-layout.spec.js` | Focuses on responsive layout of the homepage grid and footer without testing navigation behavior. |

# Battle tests

| Spec file | Responsibilities |
|-----------|------------------|
| `skip-cooldown.spec.js` | Ensures the **Next** button can skip an active cooldown and re-enable stat buttons. |

# Playwright Tests

## Settings tests
- Routes for navigation and game mode data are registered through `fixtures/commonSetup.js`, keeping specs concise.
- Each test navigates to `/src/pages/settings.html` and asserts a single concern.
- `controls expose correct labels` verifies accessible labels for toggles and feature flags.
- `tab order follows expected sequence` ensures keyboard navigation visits controls in order.

## Meditation screen

The meditation screen intentionally omits navigation links to keep the user focused on the quote, so tests pass an empty array to `verifyPageBasics` when verifying page structure.

## PRD reader tests

- `prd-reader.spec.js` stubs `prdIndex.json` and related markdown files so tests never rely on network access.
- Enable the `enableTestMode` feature flag to skip document prefetch and keep runs deterministic.

```js
await page.route("**/prdIndex.json", (route) =>
  route.fulfill({ path: "tests/fixtures/prdIndex.json" })
);
await page.route("**/docA.md", (route) =>
  route.fulfill({ path: "tests/fixtures/docA.md" })
);
```

## Reduced motion

Some specs emulate the user's reduced-motion preference to ensure animations are optional:

```js
await page.emulateMedia({ reducedMotion: "reduce" });
```
