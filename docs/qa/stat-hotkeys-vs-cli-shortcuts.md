# Stat Hotkeys vs CLI Shortcuts

Stat and CLI toggles both expose keyboard accelerators, but they target different experiences. Use this guide to confirm each flag behaves as expected.

## Feature Overview

| Flag           | Location                   | Scope                                                                       | Default |
| -------------- | -------------------------- | --------------------------------------------------------------------------- | ------- |
| `statHotkeys`  | Classic Battle (web UI)    | Number row (`1`–`5`) triggers stat buttons under the cursor-less UI.        | Enabled |
| `cliShortcuts` | Battle CLI (terminal page) | Single-key commands inside the CLI (e.g., `n` for next, `a`-`e` for stats). | Enabled |

These flags are independent: disabling one does not mutate or enable the other. Persisted states live under `featureFlags.statHotkeys` and `featureFlags.cliShortcuts`.

## Classic Battle – `statHotkeys`

1. Ensure the flag is enabled via Settings → Advanced or set `window.__FF_OVERRIDES = { statHotkeys: true }` before loading `battleClassic.html`.
2. Start a match and wait for stat buttons to become ready (`data-buttons-ready="true"`).
3. Press keys `1` through `5` and verify the corresponding stat button dispatches a click event.
4. Disable the flag and refresh; pressing number keys should no longer activate stat buttons.

Automation Hooks:

- DOM container: `#stat-buttons`
- Unit coverage: `tests/helpers/classicBattle/statHotkeys.enabled.test.js`
- Playwright smoke: `playwright/battle-classic/stat-hotkeys.smoke.spec.js`

## Battle CLI – `cliShortcuts`

1. Enable the flag via Settings or inject `window.__FF_OVERRIDES = { cliShortcuts: true }` before loading `battleCLI.html`.
2. After the CLI prompts are ready, press shortcut keys (for example `n` for “Next”, digits `1`–`5` for stats).
3. With the flag disabled, the CLI should require multi-key commands instead of single-letter shortcuts.

Automation Hooks:

- Test harness: `tests/pages/utils/loadBattleCLI.js` supports toggling both flags independently.
- Regression tests: `tests/pages/battleCLI.cliShortcutsFlag.test.js` and related CLI suites.

## Troubleshooting

- If the Classic Battle UI still responds to number keys after disabling the flag, verify the page was reloaded—feature flags are evaluated during bootstrap.
- In the CLI, confirm the flag state by inspecting `window.__FEATURE_FLAGS__.cliShortcuts` or running the harness with `{ cliShortcuts: false }`.
