# Testing Modes Guide

This document covers the specialized testing and simulation modes available in JU-DO-KON! for development, debugging, and automated testing.

## Headless Mode

For simulation runs without UI waits, enable headless mode to eliminate timing delays:

```js
import { setHeadlessMode } from "./src/helpers/headlessMode.js";
setHeadlessMode(true); // zero delays
```

### Effects
- Forces cooldowns to `0`
- Skips opponent reveal sleeps
- Eliminates UI animation delays
- Maintains full functionality without visual timing

### Usage
Ideal for automated testing, batch simulations, and performance testing where UI timing is not relevant.

## Test Mode

Enable deterministic behavior for consistent test results:

```js
import { setTestMode } from "./src/helpers/testModeUtils.js";
setTestMode(true); // deterministic RNG
```

### Effects
- Seeds randomness for predictable outcomes
- Enforces minimum one-second cooldown when headless mode is off
- Provides consistent stat selection and battle resolution
- Enables reproducible test scenarios

### Combined Usage

For comprehensive test automation, combine both modes:

```js
import { setHeadlessMode } from "./src/helpers/headlessMode.js";
import { setTestMode } from "./src/helpers/testModeUtils.js";

setHeadlessMode(true); // zero delays
setTestMode(true); // deterministic RNG
```

## Battle Debug Panel

When the `enableTestMode` feature flag is active, a debug panel appears above the player and opponent cards with live match data.

### Features
- **Live match data display**: Real-time battle state information
- **Copy button**: Copies all text for easy sharing and debugging
- **State visualization**: Current engine state and transition history

### Activation
Enable via the `enableTestMode` feature flag in settings or programmatically.

## Autostart Mode

For debugging or automated tests, bypass the initial modal:

```
battleJudoka.html?autostart=1
```

This skips the match length selection modal and begins a default-length match immediately.

## State Machine Integration

### Event Handling
Stat selections now dispatch events and rely on the state machine for round resolution. 

### Fallback Behavior
`handleStatSelection` performs direct resolution only when the orchestrator is absent (e.g., certain tests or CLI utilities).

### State Tracking
See [design/battleMarkup.md](../design/battleMarkup.md) for the canonical DOM IDs used by classic battle scripts.

## Testing Utilities

### Readiness Promises
- `window.battleReadyPromise`: Resolves when Classic Battle page is fully initialized
- `window.statButtonsReadyPromise`: Resolves when stat buttons are re-enabled for a round
- `window.settingsReadyPromise`: Resolves when settings page is ready

### Playwright Helpers
Available in `playwright/fixtures/waits.js`:
- `waitForBattleReady(page)`: Wait for battle initialization
- `waitForSettingsReady(page)`: Wait for settings page readiness  
- `waitForBattleState(page, state, timeout)`: Wait for specific machine state

### Timer Management
Classic Battle timer logic lives in `src/helpers/classicBattle/timerService.js`:
- `timerUtils.js`: Shared state snapshot and readiness helpers
- `autoSelectHandlers.js`: Stat-selection fallbacks when timers drift or stall

### Pause/Resume Flow
The CLI's pause/resume flow uses:
- `pauseTimers`: Clear active selection and cooldown timers while recording remaining time
- `resumeTimers`: Restart timers with captured values for seamless modal/tab handling

## Feature Flags for Testing

### Stat Hotkeys
Enable `statHotkeys` feature flag to map number keys 1–5 to stat buttons for quicker selection.
- Disabled by default
- Invalid numeric keys trigger hint: "Use 1-5, press H for help"

### Test Mode Indicators
Various feature flags enable testing-specific UI elements and behaviors. Check settings configuration for available flags.

## Related Documentation
- [Battle CLI Guide](./battle-cli.md) - CLI-specific testing
- [Validation Commands](./validation-commands.md) - Testing command reference
- [Components](./components.md) - Component testing strategies
