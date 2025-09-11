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

## Layout & Accessibility ✅

**CLI Layout Status: PRD Compliant** (Last assessed: 2024)

The battleCLI interface has been validated against PRD requirements with comprehensive Playwright testing (default desktop viewport 1920×1080):

- **✅ Touch Targets**: All interactive elements meet 44px minimum height requirement
- **✅ Responsive Grid**: CSS Grid layout adapts to viewport with proper column distribution
- **✅ Keyboard Navigation**: Arrow keys navigate stats, accessible focus management
- **✅ Terminal Aesthetic**: Monospace typography with retro/CLI theme support
- **✅ Accessibility**: ARIA live regions, proper labeling, screen reader support
- **✅ Performance**: Optimized bundle loading, minimal layout shifts

Key layout features:

- `#cli-stats` container uses CSS Grid with responsive columns
- `.cli-stat` elements maintain 44px minimum touch targets
- Height reservations (`min-height: 8rem`) prevent layout instability
- Color themes support both standard and CLI immersive modes
- Mobile-first responsive design with 320px+ viewport support

See `/playwright/cli-layout-assessment.spec.js` for complete validation suite.

## Usage

- `onKeyDown` handles key events for the CLI interface.
- The `battleCLI` export exposes test helpers and utilities such as `renderStatList`.
- `getEscapeHandledPromise` resolves after Escape key processing, simplifying async tests.
- Background clicks advance from **round over** or **cooldown** states; clicks on stat rows are ignored.
- The page requests a round target via `initRoundSelectModal` and falls back to a **Start match** button if the modal cannot load.
- Entering a numeric seed enables deterministic test mode; blank or non-numeric input clears the seed, disables test mode, and uses default randomness.

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

- `onKeyDown` handles key events for the CLI interface.
- The `battleCLI` export exposes test helpers and utilities such as `renderStatList`.
- `getEscapeHandledPromise` resolves after Escape key processing, simplifying async tests.
- Background clicks advance from **round over** or **cooldown** states; clicks on stat rows are ignored.
- The page requests a round target via `initRoundSelectModal` and falls back to a **Start match** button if the modal cannot load.
- Entering a numeric seed enables deterministic test mode; blank or non-numeric input clears the seed, disables test mode, and uses default randomness.

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
