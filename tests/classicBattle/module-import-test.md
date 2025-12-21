# Classic Battle module import notes

This file documents the exploratory assertions that previously lived in
`module-import-test.test.js`. Those checks covered how Vitest attaches `vi.mock`
registrations to subsequent imports of `snackbar.js` and other Classic Battle
helpers. The file is intentionally Markdown-only so it is not collected by
Vitest in CI.

Key takeaways:

- Use top-level `vi.mock()` calls to override `snackbar.js` or other helpers
  before importing modules that capture those references.
- Prefer the shared harness utilities (see `tests/helpers/integrationHarness.js`)
  instead of direct `vi.importActual()` calls when integration-style behavior is
  needed.
- Avoid depending on mock call counts to prove import behavior; assert the
  visible user effects (snackbar text, event emissions, DOM updates) instead.
