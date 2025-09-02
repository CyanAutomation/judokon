Battle CLI test helpers

This page exposes a small test helper under `window.__battleCLIinit` with several convenience methods used by Playwright/Vitest tests:

- `setCountdown(seconds)` — atomically updates `#cli-countdown[data-remaining-time]` and the visible countdown text.
- `renderSkeletonStats(count)` / `clearSkeletonStats()` — manage skeleton stat placeholders used to avoid layout shifts in visual tests.
- `focusStats()` / `focusNextHint()` — programmatic focus helpers for keyboard flows.
- `applyRetroTheme(enabled)` — toggles the retro theme, persisted in localStorage.
- `setSettingsCollapsed(collapsed)` — programmatically collapse (true) or expand (false) the settings panel; persisted in localStorage as `battleCLI.settingsCollapsed`.

Examples (in Playwright):

```js
await page.evaluate(() => window.__battleCLIinit.setCountdown(3));
await page.evaluate(() => window.__battleCLIinit.setSettingsCollapsed(true));
```

These helpers are intentionally small and synchronous to keep tests deterministic.

## Stat list interaction

When a round begins, each stat row in `#cli-stats` shows the current player's value in the format `(index) Name: value`. Clicking a row triggers the same selection logic as using the numeric keyboard shortcut.
