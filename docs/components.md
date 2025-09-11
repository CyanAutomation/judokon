# Components

## Carousel

`CarouselController` manages page-based carousels with keyboard, swipe, and resize support.

### Constructor

`new CarouselController(container, wrapper, { threshold = 50 })`

- `container`: element holding pages.
- `wrapper`: element receiving controls and markers.
- `threshold`: minimum swipe distance in pixels.

### Methods

- `next()` / `prev()` - navigate pages.
- `setPage(index)` - jump to a specific page.
- `update()` - refresh button states and markers.
- `destroy()` - remove listeners and DOM nodes.

## Scoreboard

`Scoreboard` manages round messages, timers, round counters, and match score.

### DOM creation

```js
import { createScoreboard, Scoreboard } from "../src/components/Scoreboard.js";

const container = createScoreboard();
document.body.appendChild(container);
```

### Usage

```js
const sb = new Scoreboard({
  messageEl: container.querySelector("#round-message"),
  timerEl: container.querySelector("#next-round-timer"),
  roundCounterEl: container.querySelector("#round-counter"),
  scoreEl: container.querySelector("#score-display")
});

sb.showMessage("Ready!");
sb.updateScore(1, 0);
```

## Battle Engine

The battle engine exposes a lightweight event emitter for subscribing to game state changes.

### Event Subscription

Subscribe via `on(event, handler)` from `src/helpers/battleEngineFacade.js`:

```js
import BattleEngine from "./src/helpers/BattleEngine.js";

const engine = new BattleEngine({ pointsToWin: 3 });

engine.on("roundStarted", (data) => {
  console.log(`Round ${data.round} begins`);
});

engine.on("roundEnded", (data) => {
  console.log(`Round ended: ${data.outcome}`);
});
```

### Events

- **`roundStarted`** → `{ round }`
  - Fired when a new round begins
  - Provides the current round number

- **`roundEnded`** → `{ delta, outcome, matchEnded, playerScore, opponentScore }`
  - Fired when a round completes
  - `delta`: Score change this round
  - `outcome`: Round result ("win", "lose", "tie")
  - `matchEnded`: Boolean indicating if this round ended the match
  - `playerScore`/`opponentScore`: Current match scores

- **`timerTick`** → `{ remaining, phase: 'round' | 'cooldown' }`
  - Fired during timer countdown
  - `remaining`: Milliseconds left in current phase
  - `phase`: Whether in round selection or cooldown period

- **`matchEnded`** → Same payload as `roundEnded`
  - Fired when the match concludes
  - Contains final scores and match outcome

- **`error`** → `{ message }`
  - Fired when engine errors occur
  - Provides error description for debugging

### Architecture

`BattleEngine` contains only match logic. Game modes subscribe to events and map them to UI helpers, keeping presentation separate from engine code.

## Settings API

Settings are loaded once and cached for synchronous use.

### Settings Access

```js
import { getSetting } from "./src/helpers/settingsUtils.js";

const currentTheme = getSetting("displayMode");
```

- **`getSetting(key)`** – Read a setting value from the cache
- Default values come from `DEFAULT_SETTINGS` in `src/config/settingsDefaults.js`
- Values are overlaid with any persisted user preferences

### Feature Flags

```js
import { isEnabled, setFlag, featureFlagsEmitter } from "./src/helpers/featureFlags.js";

// Check flag state
if (isEnabled("statHotkeys")) {
  // Enable hotkey functionality
}

// Update flag
setFlag("statHotkeys", true);

// Listen for changes
featureFlagsEmitter.on("change", ({ flag, enabled }) => {
  console.log(`Flag ${flag} is now ${enabled ? "enabled" : "disabled"}`);
});
```

- **`isEnabled(flag)`** – Synchronous check for a flag's enabled state
- **`setFlag(flag, value)`** – Persist a flag change and emit an update
- **`featureFlagsEmitter`** – Listen for `change` events when flags toggle

### Initialization

Call `loadSettings()` during startup to populate the cache before using these helpers. Pages should rely on `featureFlags.isEnabled` rather than accessing `settings.featureFlags` directly.

### Display Modes

- **Available modes**: `Light`, `Dark`, and `Retro`
- **Retro mode**: Terminal-style green-on-black palette (replaces former High Contrast mode)
- **Current mode**: Exposed via `document.body.dataset.theme` (e.g., `data-theme="retro"`)

## Snackbar Container

Pages that display snackbars must include a persistent container near the end of `<body>`:

```html
<div id="snackbar-container" role="status" aria-live="polite"></div>
```

**Important**: Place this element **before** any script that may trigger snackbars during page load to avoid creating a fallback container with duplicate IDs.

### Usage

```js
import { showSnackbar, updateSnackbar } from "./src/helpers/showSnackbar.js";

showSnackbar("Match started!");
updateSnackbar("Round 1 begins");
```

Both `showSnackbar` and `updateSnackbar` reuse the container element for notifications.
