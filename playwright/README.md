# Playwright Tests

## Settings tests
- Routes for navigation and game mode data are registered through `fixtures/commonSetup.js`, keeping specs concise.
- Each test navigates to `/src/pages/settings.html` and asserts a single concern.
- `controls expose correct labels` verifies accessible labels for toggles and feature flags.
- `tab order follows expected sequence` ensures keyboard navigation visits controls in order.
