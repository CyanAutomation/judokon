# Playwright Homepage Specs

| Spec file | Responsibilities |
|-----------|------------------|
| `homepage.spec.js` | Verifies footer navigation link visibility, ordering, and mobile hamburger menu behavior, along with other interactive elements. |
| `homepage-layout.spec.js` | Focuses on responsive layout of the homepage grid and footer without testing navigation behavior. |

# Playwright Tests

## Settings tests
- Routes for navigation and game mode data are registered through `fixtures/commonSetup.js`, keeping specs concise.
- Each test navigates to `/src/pages/settings.html` and asserts a single concern.
- `controls expose correct labels` verifies accessible labels for toggles and feature flags.
- `tab order follows expected sequence` ensures keyboard navigation visits controls in order.
