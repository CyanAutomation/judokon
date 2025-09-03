# Pages Test Utilities

These tests share a helper for loading the Battle CLI module.

## `loadBattleCLI(options)`

Creates DOM nodes and stubs common battle helpers. Options include:

- `verbose` – enable verbose flag.
- `cliShortcuts` – enable CLI shortcut flag.
- `pointsToWin` – initial win target.
- `autoSelect` – enable auto-select flag.
- `autoContinue` – set initial auto-continue state.
- `url` – stubbed `location` URL.
- `html` – extra HTML appended to the body.
- `stats` – stat metadata returned from `fetchJson`.
- `battleStats` – values for `BattleEngine.STATS`.

The returned module exposes a `featureFlagsEmitter` property for dispatching
feature flag events in tests.

Call `cleanupBattleCLI()` in `afterEach` to clear mocks and DOM.
