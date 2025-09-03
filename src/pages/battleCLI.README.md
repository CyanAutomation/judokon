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

## Seed validation

The CLI settings panel includes a numeric seed input used for deterministic randomness.
Only numeric values are accepted. If a non-numeric value is entered, the input reverts to
the last valid seed and an inline red error message (`Seed must be numeric.`) appears
under the field. Entering a valid number clears the error.

## Round header

The header displays the current round and win target as `Round X Target: Y 🏆`.
The `#cli-root` element mirrors these values via `data-round` and `data-target`.

## Stat list interaction

When a round begins, each stat row in `#cli-stats` shows the current player's value in the format `(index) Name: value`. Clicking a row triggers the same selection logic as using the numeric keyboard shortcut.

You can also navigate the stat rows with the arrow keys. When `#cli-stats` has focus, pressing Arrow Up/Down/Left/Right moves the active row, wrapping from the end back to the start. The listbox keeps track of the current item via `aria-activedescendant` and applies a visible focus ring.
