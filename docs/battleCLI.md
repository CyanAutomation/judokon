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
