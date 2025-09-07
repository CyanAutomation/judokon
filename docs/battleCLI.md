# Battle CLI Module Structure

The Battle CLI now separates internal concerns:

- `src/pages/battleCLI/state.js` centralizes mutable flags and the Escape key promise.
- `src/pages/battleCLI/events.js` wires keyboard events using a key→handler lookup table.

Public entry points are exposed via `src/pages/index.js`:

```js
import { battleCLI, onKeyDown } from "src/pages/index.js";
```

## Usage

- `onKeyDown` handles key events for the CLI interface.
- The `battleCLI` export exposes test helpers and utilities such as `renderStatList`.
- `getEscapeHandledPromise` resolves after Escape key processing, simplifying async tests.
- Background clicks advance from **round over** or **cooldown** states; clicks on stat rows are ignored.

## Battle state transitions

`handleBattleState` orchestrates UI changes when the battle machine moves between states. It delegates to helpers:

- `updateUiForState(state)` synchronizes badges, countdowns, and prompts.
- `ensureNextRoundButton()` inserts a Next button during `roundOver` when auto continue is off.
- `logStateChange(from, to)` appends timestamped lines to the verbose log when verbose mode is enabled.
