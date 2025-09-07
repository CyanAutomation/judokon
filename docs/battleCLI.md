# Battle CLI Module Structure

The Battle CLI now separates internal concerns:

- `src/pages/battleCLI/state.js` centralizes mutable flags and the Escape key promise.
- `src/pages/battleCLI/events.js` wires keyboard events using a key→handler lookup table.
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
