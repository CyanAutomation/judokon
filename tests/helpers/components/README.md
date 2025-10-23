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
    element: HTMLDialogElement,     // native dialog element with `modal` class
    dialog: HTMLDialogElement,      // alias for element (legacy compatibility)
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

## Usage Examples

### Modal Usage Example

```javascript
import { createModal } from "./Modal.js";

describe("Modal interactions", () => {
  it("opens and closes with focus management", () => {
    const content = document.createElement("div");
    content.innerHTML = "<p>Modal content</p>";
    
    const modal = createModal(content);
    document.body.appendChild(modal.element);
    
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    
    // Open modal
    modal.open(trigger);
    expect(modal.isOpen).toBe(true);
    expect(modal.element.hasAttribute("open")).toBe(true);
    expect(modal.onOpen).toHaveBeenCalledWith(trigger);

    // Close modal
    modal.close();
    expect(modal.isOpen).toBe(false);
    expect(modal.element.hasAttribute("open")).toBe(false);
    expect(modal.onClose).toHaveBeenCalled();

    modal.destroy();
  });
});
```

### Scoreboard Usage Example

```javascript
import { createScoreboard } from "./Scoreboard.js";

describe("Scoreboard updates", () => {
  it("updates score and timer", () => {
    const scoreboard = createScoreboard();
    document.body.appendChild(scoreboard.element);
    
    // Update score
    scoreboard.updateScore({ player: 10, opponent: 5 });
    expect(scoreboard.getScore()).toEqual({ player: 10, opponent: 5 });
    
    // Update timer
    scoreboard.updateTimer(30);
    expect(scoreboard.getTimer()).toBe(30);
    
    // Update message
    scoreboard.updateMessage("Round 2 starting...");
    expect(scoreboard.getMessage()).toBe("Round 2 starting...");
  });
});
```

### StatsPanel Usage Example

```javascript
import { createStatsPanel } from "./StatsPanel.js";

describe("StatsPanel loading", () => {
  it("loads and displays stats", async () => {
    const mockStats = {
      strength: 85,
      speed: 90,
      technique: 75
    };
    
    const panel = await createStatsPanel(mockStats);
    document.body.appendChild(panel.element);
    
    // Verify stats loaded
    expect(panel.getStatValue("strength")).toBe(85);
    expect(panel.getStatValue("speed")).toBe(90);
    
    // Update stats
    panel.update({ strength: 88, speed: 92 });
    expect(panel.onUpdate).toHaveBeenCalledWith({ strength: 88, speed: 92 });
  });
});
```

### Button Usage Example

```javascript
import { createButton } from "./Button.js";

describe("Button interactions", () => {
  it("handles clicks and state changes", () => {
    const button = createButton("Click me", { id: "test-btn" });
    document.body.appendChild(button.element);
    
    // Test programmatic click
    button.click();
    expect(button.onClick).toHaveBeenCalled();
    
    // Test text update
    button.setText("New text");
    expect(button.element.textContent).toBe("New text");
    
    // Test disabled state
    button.setDisabled(true);
    expect(button.element.disabled).toBe(true);
  });
  
  it("supports icons", () => {
    const iconSvg = '<svg><circle cx="10" cy="10" r="5"/></svg>';
    const button = createButton("With Icon", { icon: iconSvg });
    
    expect(button.element.querySelector("svg")).toBeTruthy();
    expect(button.element.querySelector(".button-label").textContent).toBe("With Icon");
  });
});
```

### Card Usage Example

```javascript
import { createCard } from "./Card.js";

describe("Card content", () => {
  it("handles different content types", () => {
    // Text content
    const textCard = createCard("Simple text content");
    expect(textCard.element.textContent).toBe("Simple text content");
    
    // HTML content
    const htmlCard = createCard("<strong>HTML content</strong>", { 
      allowHtml: true 
    });
    expect(htmlCard.element.querySelector("strong")).toBeTruthy();
    
    // DOM node content
    const div = document.createElement("div");
    div.textContent = "DOM content";
    const domCard = createCard(div);
    expect(domCard.element.contains(div)).toBe(true);
  });
  
  it("supports click handling", () => {
    const clickableCard = createCard("Clickable", { clickable: true });
    
    clickableCard.element.click();
    expect(clickableCard.onClick).toHaveBeenCalled();
  });
});
```

## Migration Guide

### From Inline DOM Creation

Replace repetitive DOM creation patterns:

```javascript
// Before: Manual button creation
const btn = document.createElement("button");
btn.textContent = "Save";
btn.id = "save-btn";
btn.addEventListener("click", handleSave);
container.appendChild(btn);

// After: Factory usage
const { element: btn, onClick } = createButton("Save", { id: "save-btn" });
btn.addEventListener("click", handleSave);
container.appendChild(btn);
// Or use spy: expect(onClick).toHaveBeenCalled()
```

### From Basic DOM Factories

Upgrade from `domFactory.js` helpers to component-specific factories:

```javascript
// Before: Basic button
const btn = createButton({ text: "Save" });

// After: Component button with full API
const { element: btn, onClick, setDisabled } = createButton("Save");
setDisabled(true); // Additional control
expect(onClick).toHaveBeenCalled(); // Better assertions
```

### Testing Patterns

Factories enable better testing patterns:

```javascript
// Observable hooks for assertions
const modal = createModal(content);
modal.open(trigger);
expect(modal.onOpen).toHaveBeenCalledWith(trigger);

// State verification
const scoreboard = createScoreboard();
scoreboard.updateScore({ player: 10 });
expect(scoreboard.getScore().player).toBe(10);

// Event verification
const button = createButton("Click me");
button.element.click();
expect(button.onClick).toHaveBeenCalled();
```

## Best Practices

- **Use factories for complex components**: Reserve inline DOM creation for simple, one-off elements
- **Leverage observable hooks**: Use spies for event verification instead of manual event listeners
- **Test realistic scenarios**: Factories provide behavior matching real components
- **Combine with existing helpers**: Use factories alongside `domFactory.js` and `rafMock.js`
- **Document new patterns**: Add examples to this README when creating new factories

## Contributing

When adding new component factories:

1. Follow the API contract pattern: `{ element, ...methods, ...spies }`
2. Include comprehensive unit tests
3. Add usage examples to this README
4. Update the index.js re-exports
5. Ensure realistic behavior matching the real component
