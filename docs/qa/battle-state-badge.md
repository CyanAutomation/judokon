# Battle State Badge QA Guide

The `battleStateBadge` feature flag surfaces a live badge in Classic Battle that mirrors the current match phase for testers. When the flag is enabled, both the page and the badge expose `data-feature-battle-state-badge` markers so automation can assert state without relying on visual heuristics.

## Quick Checklist

1. Enable the flag from Settings → Advanced (`Battle State Badge`) or via `window.__FF_OVERRIDES = { battleStateBadge: true }` before loading Classic Battle.
2. Load `src/pages/battleClassic.html` and wait for the round prompt to appear.
3. Confirm the following attributes:
   - `<body data-feature-battle-state-badge="enabled">`
   - `#battle-state-badge[data-feature-battle-state-badge="enabled"]` with text that matches the current battle state (for example, `Round Intro`, `Player Turn`, `Opponent Turn`).
4. Toggle the flag off and refresh:
   - `<body data-feature-battle-state-badge="disabled">`
   - Badge element removed from the DOM.

## Automation Hooks

- Body marker: `document.body.getAttribute("data-feature-battle-state-badge")`
- Badge marker: `document.querySelector("#battle-state-badge")?.getAttribute("data-feature-battle-state-badge")`

Both markers are updated by `setBattleStateBadgeEnabled` in `src/helpers/classicBattle/uiHelpers.js`. Existing unit coverage (`tests/helpers/classicBattle/uiHelpers.featureFlags.test.js`) and Playwright probes (`playwright/battle-classic/feature-flags.spec.js`) assert these attributes—mirror their patterns for future scenarios.

## Troubleshooting Tips

- If the badge does not appear, make sure Classic Battle is bootstrapped through `setupClassicBattlePage` (already wired in `src/pages/battleClassic.html`) and that the flag is enabled before the page finishes loading.
- When running headless Playwright against GitHub Pages builds, add a `waitForSelector("#battle-state-badge")` guard before reading its text/value to account for animation timing.
