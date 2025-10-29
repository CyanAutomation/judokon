# Test Helpers

This directory contains shared utilities and factories for writing reliable, maintainable unit tests.

## Overview

The helpers in this directory provide:

- **DOM Factories**: Consistent creation of mock DOM elements with realistic behavior
- **Event Utilities**: Tools for testing event handling and listener wiring
- **Console Management**: Helpers for muting console output during tests
- **RAF Mocking**: Deterministic control over `requestAnimationFrame` for timing-sensitive tests
- **Scheduler Control**: Test-friendly hooks for deterministic scheduler behavior

## Quick Start

```javascript
import { createStatButton, createSnackbar, attachEventSpy, withMutedConsole } from "../helpers/domFactory.js";

// Create a stat button with custom props
const btn = createStatButton({ label: "Power", aria: "Select power stat", disabled: false });

// Create a snackbar for testing notifications
const snackbar = createSnackbar();
snackbar.show("Round started!");
expect(snackbar.lastMessage).toBe("Round started!");

// Attach spy to test event handling
const spy = attachEventSpy(btn, "click");
btn.click();
expect(spy).toHaveBeenCalled();

// Mute console during noisy operations
await withMutedConsole(async () => {
  // Code that logs warnings/errors
});
```

## Helpers Reference

### DOM Factories

#### `createStatButton(options)`

Creates a button element suitable for stat selection.

**Options:**

- `label` (string): Button text (default: "Stat")
- `aria` (string): ARIA label (default: label value)
- `disabled` (boolean): Initial disabled state (default: false)

**Returns:** `HTMLButtonElement` with mocked click behavior.

#### `createSnackbar()`

Creates a snackbar element for testing notifications.

**Returns:** Object with:

- `element`: `HTMLDivElement` with class "snackbar"
- `show(message)`: Shows the snackbar with message
- `hide()`: Hides the snackbar
- `lastMessage` (getter): Last shown message

#### `createScoreboard()`

Creates a scoreboard element for testing score displays.

**Returns:** Object with:

- `element`: `HTMLDivElement` with class "scoreboard"
- `updateScore({ player, opponent })`: Updates and re-renders scores
- `render()`: Manually re-renders

#### `createButton(options)`

Generic button factory.

**Options:**

- `text` (string): Button text
- `id` (string): Element ID
- `className` (string): CSS class
- `disabled` (boolean): Disabled state

#### `createDiv(options)`

Generic div factory.

**Options:**

- `id` (string): Element ID
- `className` (string): CSS class
- `textContent` (string): Initial text

### Event Utilities

#### `attachEventSpy(element, eventName)`

Attaches a Vitest spy to an element's event listener.

**Parameters:**

- `element`: DOM element
- `eventName`: Event type (e.g., "click")

**Returns:** Spy function that records calls.

### Console Management

#### `withMutedConsole(fn)`

Runs an async function with console.warn/error muted.

**Parameters:**

- `fn`: Async function to execute

**Returns:** Promise resolving to fn's return value.

## Best Practices

### Prefer Helpers Over Inline Creation

Instead of:

```javascript
const btn = document.createElement("button");
btn.textContent = "Stat";
btn.disabled = false;
```

Use:

```javascript
const btn = createStatButton({ label: "Stat" });
```

### Test Realistic Behavior

Helpers mirror real DOM behavior:

- Disabled buttons don't fire clicks
- ARIA attributes are set correctly
- Elements have appropriate classes/IDs

### Use Event Spies for Listener Testing

```javascript
const spy = attachEventSpy(button, "click");
// Trigger interaction
expect(spy).toHaveBeenCalledWith(event);
```

### Mute Console in Error Scenarios

```javascript
await withMutedConsole(async () => {
  expect(() => riskyOperation()).toThrow();
});
```

### Scheduler Test Controller

For tests involving the RAF-based scheduler (`src/utils/scheduler.js`), use `createTestController()` for deterministic control without global monkey-patching.

```javascript
import { createTestController } from "../../src/utils/scheduler.js";

// Enable test mode
globalThis.__TEST__ = true;

describe("My Component", () => {
  let controller;

  beforeEach(() => {
    controller = createTestController();
  });

  afterEach(() => {
    controller?.dispose();
  });

  it("handles RAF callbacks deterministically", () => {
    // Code that schedules RAF callbacks
    scheduleSomething();

    // Advance one frame
    controller.advanceFrame();

    // Verify effects
    expect(someEffect).toHaveBeenCalled();
  });
});
```

**API:**

- `advanceFrame()`: Execute pending RAF callbacks
- `advanceTime(ms)`: Advance time and execute callbacks
- `getFrameCount()`: Get number of frames processed
- `dispose()`: Clean up controller

## Migration Guide

When migrating existing tests:

1. Replace `document.createElement("button")` with `createButton()` or `createStatButton()`
2. Replace `document.createElement("div")` with `createDiv()`
3. Use `attachEventSpy()` instead of manual event listener setup
4. Wrap error-generating code with `withMutedConsole()`

## Contributing

When adding new helpers:

- Include comprehensive unit tests
- Document parameters and return values
- Follow the existing API patterns
- Update this README with examples

## Related Files

- `domFactory.js`: Core DOM factories and utilities
- Helper validations: Covered by helper-focused suites in `tests/helpers/` (e.g., `scrollButtonState.test.js`, `domFactory.js` usage in component tests)
- `rafMock.js`: RequestAnimationFrame mocking utilities
- `src/utils/scheduler.js`: Scheduler with test controller API
