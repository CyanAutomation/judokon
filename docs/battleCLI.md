# Battle CLI Module Structure

The Battle CLI now separates internal concerns:

- `src/pages/battleCLI/state.js` centralizes mutable flags and the Escape key promise.
- `src/pages/battleCLI/events.js` now delegates keyboard handling to small helpers:
  - `handleArrowNav(e)` manages stat list navigation.
  - `shouldProcessKey(key)` skips disabled or disallowed shortcuts.
  - `routeKeyByState(key)` routes keys based on battle state.
- Stat list generation now uses dedicated helpers:
  - `loadStatDefs()` caches stat definitions.
  - `buildStatRows(stats, judoka)` constructs the DOM rows.
  - `renderHelpMapping(stats)` renders the help mapping once.
  - `ensureStatClickBinding(list)` binds click handlers only once.

Public entry points are exposed via `src/pages/index.js`:

```js
import { battleCLI, onKeyDown } from "src/pages/index.js";
```

## Usage

- `onKeyDown` handles key events for the CLI interface.
- The `battleCLI` export exposes test helpers and utilities such as `renderStatList`.
- `getEscapeHandledPromise` resolves after Escape key processing, simplifying async tests.
- Background clicks advance from **round over** or **cooldown** states; clicks on stat rows are ignored.
- Matches start via a **Start match** button that opens a round selection modal to choose the points target.

## Headless simulations

Bulk AI or Monte Carlo runs can remove waits by enabling headless mode:

```js
import { setHeadlessMode } from "../helpers/headlessMode.js";
import { setTestMode } from "../helpers/testModeUtils.js";

setHeadlessMode(true); // no cooldown delays
setTestMode(true); // deterministic RNG
```

Headless mode skips inter-round cooldowns and opponent reveal sleeps. Combine it with test mode for reproducible, fast CLI matches.

## Battle state transitions

`handleBattleState` orchestrates UI changes when the battle machine moves between states. It delegates to helpers:

- `updateUiForState(state)` synchronizes badges, countdowns, and prompts.
- `ensureNextRoundButton()` inserts a Next button during `roundOver` when auto continue is off.
- `logStateChange(from, to)` appends timestamped lines to the verbose log when verbose mode is enabled.
