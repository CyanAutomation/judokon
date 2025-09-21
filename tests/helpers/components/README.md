# Component Factory API Contract

## Overview

This document defines the API contract for component factories in `tests/helpers/components/`. These factories provide realistic mock implementations of high-traffic UI components for testing, eliminating repetitive DOM creation and wiring logic.

## Target Components

Based on usage analysis, the following components are prioritized for factory implementation:

1. **Modal** - Most complex component with focus management, ARIA attributes, and event handling
2. **Scoreboard** - Frequently mocked in battle tests with timer/score updates
3. **StatsPanel** - Complex component with stat loading and tooltip integration
4. **Button** - Basic but frequently created with various configurations
5. **Card** - Basic card container with content insertion options

## API Surface Contract

### Factory Function Signature

Each factory follows this pattern:

```javascript
export function createMockComponentName(options = {}) {
  // Returns object with:
  return {
    element: HTMLElement,        // The DOM element
    // ... component-specific methods and properties
    // ... observable hooks for testing
  };
}
```

### Common API Elements

All factories must provide:

- **`element`**: The root DOM element for mounting/appending
- **Realistic behavior**: Mimic the actual component's DOM structure and behavior
- **Observable hooks**: Ways to inspect state and emitted events
- **Configuration options**: Support common component configuration patterns
- **Mounting support**: Ability to append to containers or return for manual mounting

### Specific Component APIs

#### Modal Factory

```javascript
export function createModal(content, options = {}) {
  return {
    element: HTMLElement,           // modal-backdrop with hidden attribute
    dialog: HTMLElement,            // inner modal dialog element
    open(trigger),                  // open method with focus management
    close(),                        // close method with focus return
    destroy(),                      // cleanup method
    isOpen: boolean,                // observable state
    onOpen: spy,                    // spy for open events
    onClose: spy                    // spy for close events
  };
}
```

#### Scoreboard Factory

```javascript
export function createScoreboard(container) {
  return {
    element: HTMLElement,           // scoreboard container
    model: ScoreboardModel,         // internal model instance
    view: ScoreboardView,           // internal view instance
    render(state),                  // render method
    updateScore(score),             // score update helper
    updateTimer(seconds),           // timer update helper
    updateMessage(text),            // message update helper
    getScore(),                     // score getter
    getTimer(),                     // timer getter
    getMessage()                    // message getter
  };
}
```

#### StatsPanel Factory

```javascript
export function createStatsPanel(stats, options = {}) {
  return {
    element: HTMLElement,           // stats panel root
    update(stats),                  // update method
    getStatElements(),              // get individual stat elements
    getStatValue(statName),         // get specific stat value
    onUpdate: spy                   // spy for update calls
  };
}
```

#### Button Factory

```javascript
export function createButton(text, options = {}) {
  return {
    element: HTMLButtonElement,     // button element
    click(),                        // programmatic click
    setText(text),                  // text update method
    setDisabled(disabled),          // disabled state setter
    onClick: spy                    // click event spy
  };
}
```

#### Card Factory

```javascript
export function createCard(content, options = {}) {
  return {
    element: HTMLElement,           // card element
    updateContent(content),         // content update method
    setClassName(className),        // class update method
    onClick: spy                    // click event spy (if applicable)
  };
}
```

## Implementation Guidelines

### File Structure

```
tests/helpers/components/
├── index.js              # Re-exports all factories
├── Modal.js              # Modal factory
├── Scoreboard.js         # Scoreboard factory
├── StatsPanel.js         # StatsPanel factory
├── Button.js             # Button factory
├── Card.js               # Card factory
└── README.md             # Usage documentation
```

### Testing Requirements

Each factory must have:

- Unit tests verifying DOM structure matches real component
- Tests for all public methods and properties
- Tests for observable hooks and spies
- Integration tests showing usage in actual test scenarios

### Migration Path

Factories should be designed to replace existing inline DOM creation patterns:

```javascript
// Before: Inline DOM creation
const btn = document.createElement("button");
btn.textContent = "Click me";
btn.addEventListener("click", handler);

// After: Factory usage
const { element: btn, onClick } = createButton("Click me");
btn.addEventListener("click", handler);
// or use the spy: expect(onClick).toHaveBeenCalled()
```

## Acceptance Criteria

- [ ] API contract document reviewed and approved
- [ ] All target components have factory implementations
- [ ] Factories include comprehensive unit tests
- [ ] Factories provide observable hooks for testing
- [ ] Factories match real component DOM structure and behavior
- [ ] Documentation includes usage examples and migration guide
