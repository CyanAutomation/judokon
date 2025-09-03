# Pages Test Utilities

These tests share a helper for loading the Battle CLI module.

## `loadBattleCLI(options)`

Creates DOM nodes and stubs common battle helpers. Options include:

- `verbose` – enable verbose flag.
- `cliShortcuts` – enable CLI shortcut flag.
- `pointsToWin` – initial win target.
- `autoSelect` – enable auto-select flag.
- `url` – stubbed `location` URL.
- `html` – extra HTML appended to the body.
- `stats` – stat metadata returned from `fetchJson`.
- `battleStats` – values for `BattleEngine.STATS`.

Call `cleanupBattleCLI()` in `afterEach` to clear mocks and DOM.
