# Test Helpers### DOM Factories



This directory contains shared utilities and factories for writing reliable, maintainable unit tests.#### `createStatButton(options)`



## OverviewCreates a button element suitable for stat selection.



The helpers in this directory provide:**Options:**



- **DOM Factories**: Consistent creation of mock DOM elements with realistic behavior- `label` (string): Button text (default: "Stat")

- **Event Utilities**: Tools for testing event handling and listener wiring- `aria` (string): ARIA label (default: label value)

- **Console Management**: Helpers for muting console output during tests- `disabled` (boolean): Initial disabled state (default: false)

- **RAF Mocking**: Deterministic control over `requestAnimationFrame` for timing-sensitive tests

**Returns:** `HTMLButtonElement` with mocked click behavior.

## Quick Start

#### `createSnackbar()`

```javascript

import { createStatButton, createSnackbar, attachEventSpy, withMutedConsole } from "../helpers/domFactory.js";Creates a snackbar element for testing notifications.



// Create a stat button with custom props**Returns:** `HTMLDivElement` with class "snackbar"

const btn = createStatButton({ label: "Power", aria: "Select power stat", disabled: false });

#### `createScoreboard()`

// Create a snackbar for testing notifications

const snackbar = createSnackbar();Creates a scoreboard element for testing score displays.

snackbar.show("Round started!");

expect(snackbar.lastMessage).toBe("Round started!");**Returns:** Object with:



// Attach spy to test event handling- `element`: `HTMLDivElement` with class "scoreboard"

const spy = attachEventSpy(btn, "click");- `updateScore({ player, opponent })`: Updates and re-renders scores

btn.click();- `render()`: Manually re-renders

expect(spy).toHaveBeenCalled();- `lastMessage` (getter): Last shown message



// Mute console during noisy operations#### `createButton(options)`

await withMutedConsole(async () => {

  // Code that logs warnings/errorsGeneric button factory.

});

```**Options:**



## Helpers Reference- `text` (string): Button text

- `id` (string): Element ID

### DOM Factories- `className` (string): CSS class

- `disabled` (boolean): Disabled state

#### `createStatButton(options)`

#### `createDiv(options)`

Creates a button element suitable for stat selection.

Generic div factory.

**Options:**

**Options:**

- `label` (string): Button text (default: "Stat")

- `aria` (string): ARIA label (default: label value)- `id` (string): Element ID

- `disabled` (boolean): Initial disabled state (default: false)- `className` (string): CSS class

- `textContent` (string): Initial text

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
- `domFactory.test.js`: Unit tests for all helpers
- `rafMock.js`: RequestAnimationFrame mocking utilities