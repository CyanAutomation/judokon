/**
 * Unit tests for actionBar.js component
 *
 * @fileoverview Tests the Battle Action Bar component lifecycle, state management,
 * keyboard shortcuts, and integration with the battle engine.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createActionBar } from "../../src/helpers/actionBar.js";
import { STATS } from "../../src/helpers/BattleEngine.js";

describe("Action Bar Component", () => {
  let container;
  let mockEngine;
  let actionBar;
  let engineHandlers;

  beforeEach(() => {
    // Create a test container
    container = document.createElement("div");
    document.body.appendChild(container);

    // Create a mock battle engine with event emitter
    engineHandlers = new Map();
    mockEngine = {
      on: vi.fn((event, handler) => {
        engineHandlers.set(event, handler);
        return mockEngine;
      }),
      off: vi.fn((event, handler) => {
        if (engineHandlers.get(event) === handler) {
          engineHandlers.delete(event);
        }
        return mockEngine;
      }),
      emit: vi.fn()
    };
  });

  afterEach(() => {
    // Clean up
    if (actionBar) {
      actionBar.destroy();
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    vi.clearAllMocks();
  });

  describe("Initialization", () => {
    it("should throw error if engine is not provided", () => {
      expect(() => {
        createActionBar({ container });
      }).toThrow("Battle engine instance required for ActionBar");
    });

    it("should throw error for invalid battle mode", () => {
      expect(() => {
        createActionBar({ engine: mockEngine, mode: "invalid", container });
      }).toThrow("Invalid battle mode");
    });

    it("should create action bar with default mode", () => {
      actionBar = createActionBar({ engine: mockEngine, container });
      expect(actionBar).toBeDefined();
      expect(actionBar.render).toBeDefined();
      expect(actionBar.destroy).toBeDefined();
    });

    it("should create action bar with valid modes", () => {
      const modes = ["classic", "cli", "bandit", "quick"];
      modes.forEach((mode) => {
        const ab = createActionBar({ engine: mockEngine, mode, container });
        expect(ab).toBeDefined();
        ab.destroy();
      });
    });
  });

  describe("DOM Rendering", () => {
    beforeEach(() => {
      actionBar = createActionBar({ engine: mockEngine, container });
    });

    it("should render the action bar element", () => {
      const element = actionBar.render();
      expect(element).toBeInstanceOf(HTMLElement);
      expect(element.className).toContain("action-bar");
    });

    it("should have correct mode class", () => {
      actionBar = createActionBar({ engine: mockEngine, mode: "cli", container });
      const element = actionBar.render();
      expect(element.className).toContain("action-bar--cli");
    });

    it("should create 7 buttons (options + 5 stats + action)", () => {
      const element = actionBar.render();
      const buttons = element.querySelectorAll("button");
      expect(buttons).toHaveLength(7);
    });

    it("should have options button", () => {
      const element = actionBar.render();
      const optionsBtn = element.querySelector('[data-action-button-id="options"]');
      expect(optionsBtn).toBeDefined();
      expect(optionsBtn?.textContent).toBe("⚙");
    });

    it("should have all 5 stat buttons with correct labels", () => {
      const element = actionBar.render();
      STATS.forEach((stat) => {
        const btn = element.querySelector(`[data-action-button-id="${stat}"]`);
        expect(btn).toBeDefined();
      });
    });

    it("should have action button", () => {
      const element = actionBar.render();
      const actionBtn = element.querySelector('[data-action-button-id="action"]');
      expect(actionBtn).toBeDefined();
      expect(actionBtn?.textContent).toBe("Next");
    });

    it("should set proper ARIA attributes", () => {
      const element = actionBar.render();
      expect(element.getAttribute("role")).toBe("toolbar");
      expect(element.getAttribute("aria-label")).toBe("Battle controls");
    });

    it("should stat buttons be initially disabled", () => {
      const element = actionBar.render();
      STATS.forEach((stat) => {
        const btn = element.querySelector(`[data-action-button-id="${stat}"]`);
        expect(btn?.disabled).toBe(true);
        expect(btn?.getAttribute("data-stat-enabled")).toBe("false");
      });
    });

    it("should action button be initially enabled", () => {
      const element = actionBar.render();
      const actionBtn = element.querySelector('[data-action-button-id="action"]');
      expect(actionBtn?.disabled).toBe(false);
    });

    it("should return same element on multiple render calls", () => {
      const element1 = actionBar.render();
      const element2 = actionBar.render();
      expect(element1).toBe(element2);
    });
  });

  describe("Button Interactions", () => {
    it("should call onStatSelected handler when stat button clicked", () => {
      const handler = vi.fn();
      actionBar = createActionBar({
        engine: mockEngine,
        container,
        handlers: { onStatSelected: handler }
      });
      actionBar.render();
      actionBar.setStatButtonsEnabled(true);

      const btn = container.querySelector('[data-action-button-id="power"]');
      btn?.click();

      expect(handler).toHaveBeenCalledWith("power");
    });

    it("should not call onStatSelected if stat buttons are disabled", () => {
      const handler = vi.fn();
      actionBar = createActionBar({
        engine: mockEngine,
        container,
        handlers: { onStatSelected: handler }
      });
      actionBar.render();

      const btn = container.querySelector('[data-action-button-id="power"]');
      btn?.click();

      expect(handler).not.toHaveBeenCalled();
    });

    it("should call onActionClick handler when action button clicked", () => {
      const handler = vi.fn();
      actionBar = createActionBar({
        engine: mockEngine,
        container,
        handlers: { onActionClick: handler }
      });
      actionBar.render();

      const btn = container.querySelector('[data-action-button-id="action"]');
      btn?.click();

      expect(handler).toHaveBeenCalledWith("next");
    });

    it("should call onOptionsClick handler when options button clicked", () => {
      const handler = vi.fn();
      actionBar = createActionBar({
        engine: mockEngine,
        container,
        handlers: { onOptionsClick: handler }
      });
      actionBar.render();

      const btn = container.querySelector('[data-action-button-id="options"]');
      btn?.click();

      expect(handler).toHaveBeenCalled();
    });

    it("should not call handler after destroy", () => {
      const handler = vi.fn();
      actionBar = createActionBar({
        engine: mockEngine,
        container,
        handlers: { onActionClick: handler }
      });
      actionBar.render();
      actionBar.destroy();

      const btn = container.querySelector('[data-action-button-id="action"]');
      btn?.click();

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("Keyboard Shortcuts", () => {
    const createKeyboardEvent = (key) => {
      const event = new KeyboardEvent("keydown", { key });
      const preventDefault = vi.fn();

      Object.defineProperty(event, "preventDefault", {
        value: preventDefault,
        writable: true
      });

      return { event, preventDefault };
    };

    const shortcutScenarios = [
      ...STATS.map((stat, index) => ({
        description: `pressing ${index + 1} triggers ${stat} when stat buttons enabled`,
        handlerName: "onStatSelected",
        expectedArg: stat,
        key: `${index + 1}`,
        statButtonsEnabled: true,
        expectInvocation: true
      })),
      {
        description: "pressing o triggers options",
        handlerName: "onOptionsClick",
        key: "o",
        expectInvocation: true
      },
      {
        description: "pressing Enter triggers action",
        handlerName: "onActionClick",
        expectedArg: "next",
        key: "Enter",
        expectInvocation: true
      },
      {
        description: "pressing Space triggers action",
        handlerName: "onActionClick",
        expectedArg: "next",
        key: " ",
        expectInvocation: true
      },
      {
        description: "does not trigger stat shortcut when buttons are disabled",
        handlerName: "onStatSelected",
        expectedArg: STATS[0],
        key: "1",
        statButtonsEnabled: false,
        expectInvocation: false
      },
      {
        description: "ignores Enter when an input is focused",
        handlerName: "onActionClick",
        expectedArg: "next",
        key: "Enter",
        activeElementTag: "INPUT",
        expectInvocation: false
      },
      {
        description: "ignores Space when an input is focused",
        handlerName: "onActionClick",
        expectedArg: "next",
        key: " ",
        activeElementTag: "INPUT",
        expectInvocation: false
      }
    ];

    shortcutScenarios.forEach(
      ({
        description,
        handlerName,
        expectedArg,
        key,
        statButtonsEnabled,
        activeElementTag,
        expectInvocation
      }) => {
        it(`handles keyboard shortcut: ${description}`, () => {
          const handler = vi.fn();

          actionBar = createActionBar({
            engine: mockEngine,
            container,
            handlers: { [handlerName]: handler }
          });
          actionBar.render();

          if (statButtonsEnabled) {
            actionBar.setStatButtonsEnabled(true);
          }

          let activeElement;
          if (activeElementTag) {
            activeElement = document.createElement(activeElementTag.toLowerCase());
            document.body.appendChild(activeElement);
            activeElement.focus();
          }

          const { event, preventDefault } = createKeyboardEvent(key);

          document.dispatchEvent(event);

          if (activeElement) {
            activeElement.remove();
            document.body.focus();
          }

          if (expectInvocation) {
            if (expectedArg !== undefined) {
              expect(handler).toHaveBeenCalledWith(expectedArg);
            } else {
              expect(handler).toHaveBeenCalled();
            }
            expect(preventDefault).toHaveBeenCalled();
          } else {
            expect(handler).not.toHaveBeenCalled();
            expect(preventDefault).not.toHaveBeenCalled();
          }
        });
      }
    );

    it("should not trigger keyboard shortcut after destroy", () => {
      const handler = vi.fn();
      actionBar = createActionBar({
        engine: mockEngine,
        container,
        handlers: { onActionClick: handler }
      });
      actionBar.render();
      actionBar.destroy();

      const { event, preventDefault } = createKeyboardEvent("Enter");
      document.dispatchEvent(event);

      expect(handler).not.toHaveBeenCalled();
      expect(preventDefault).not.toHaveBeenCalled();
    });
  });

  describe("State Management", () => {
    beforeEach(() => {
      actionBar = createActionBar({ engine: mockEngine, container });
      actionBar.render();
    });

    it("should enable/disable stat buttons", () => {
      let element = container.querySelector('[data-action-button-id="power"]');
      expect(element?.disabled).toBe(true);

      actionBar.setStatButtonsEnabled(true);
      element = container.querySelector('[data-action-button-id="power"]');
      expect(element?.disabled).toBe(false);

      actionBar.setStatButtonsEnabled(false);
      element = container.querySelector('[data-action-button-id="power"]');
      expect(element?.disabled).toBe(true);
    });

    it("should update action button state", () => {
      actionBar.setActionButtonState("start");
      let element = container.querySelector('[data-action-button-id="action"]');
      expect(element?.textContent).toBe("Start");
      expect(element?.getAttribute("data-action-state")).toBe("start");

      actionBar.setActionButtonState("draw");
      element = container.querySelector('[data-action-button-id="action"]');
      expect(element?.textContent).toBe("Draw");
      expect(element?.getAttribute("data-action-state")).toBe("draw");
    });

    it("should disable action button when needed", () => {
      let element = container.querySelector('[data-action-button-id="action"]');
      expect(element?.disabled).toBe(false);

      actionBar.setActionButtonState("next", true);
      element = container.querySelector('[data-action-button-id="action"]');
      expect(element?.disabled).toBe(true);
    });

    it("should return current state", () => {
      const state = actionBar.getState();
      expect(state).toHaveProperty("statButtonsEnabled");
      expect(state).toHaveProperty("actionState");
      expect(state).toHaveProperty("actionButtonEnabled");
      expect(state).toHaveProperty("mode");
    });

    it("should update state from provided object", () => {
      actionBar.update({
        statSelectionRequired: true,
        actionState: "draw",
        actionDisabled: false
      });

      const state = actionBar.getState();
      expect(state.statButtonsEnabled).toBe(true);
      expect(state.actionState).toBe("draw");
      expect(state.actionButtonEnabled).toBe(true);
    });
  });

  describe("Lifecycle", () => {
    it("should subscribe to engine events and toggle stat buttons", () => {
      actionBar = createActionBar({ engine: mockEngine, container });
      actionBar.render();

      const roundStartHandler = engineHandlers.get("roundStart");
      const roundEndHandler = engineHandlers.get("roundEnd");
      const statSelectedHandler = engineHandlers.get("statSelected");
      expect(roundStartHandler).toBeInstanceOf(Function);
      expect(roundEndHandler).toBeInstanceOf(Function);
      expect(statSelectedHandler).toBeInstanceOf(Function);

      const powerButton = container.querySelector('[data-action-button-id="power"]');
      expect(powerButton?.disabled).toBe(true);
      expect(powerButton?.getAttribute("data-stat-enabled")).toBe("false");

      roundStartHandler();
      expect(powerButton?.disabled).toBe(false);
      expect(powerButton?.getAttribute("data-stat-enabled")).toBe("true");

      roundEndHandler();
      expect(powerButton?.disabled).toBe(true);
      expect(powerButton?.getAttribute("data-stat-enabled")).toBe("false");

      statSelectedHandler();
      expect(powerButton?.disabled).toBe(true);
      expect(powerButton?.getAttribute("data-stat-enabled")).toBe("false");
    });

    it("should clean up on destroy", () => {
      actionBar = createActionBar({ engine: mockEngine, container });
      actionBar.render();

      const roundStartHandler = engineHandlers.get("roundStart");
      const roundEndHandler = engineHandlers.get("roundEnd");
      const statSelectedHandler = engineHandlers.get("statSelected");

      actionBar.destroy();

      expect(mockEngine.off).toHaveBeenCalledWith("roundStart", roundStartHandler);
      expect(mockEngine.off).toHaveBeenCalledWith("roundEnd", roundEndHandler);
      expect(mockEngine.off).toHaveBeenCalledWith("statSelected", statSelectedHandler);
      expect(container.querySelector(".action-bar")).toBeNull();
    });

    it("should have accessible element property", () => {
      actionBar = createActionBar({ engine: mockEngine, container });
      actionBar.render();

      expect(actionBar.element).toBeInstanceOf(HTMLElement);
    });

    it("should handle multiple renders gracefully", () => {
      actionBar = createActionBar({ engine: mockEngine, container });

      const elem1 = actionBar.render();
      const elem2 = actionBar.render();

      expect(elem1).toBe(elem2);
      expect(container.querySelectorAll(".action-bar")).toHaveLength(1);
    });
  });

  describe("Accessibility", () => {
    beforeEach(() => {
      actionBar = createActionBar({ engine: mockEngine, container });
      actionBar.render();
    });

    it("should have accessible role and labels", () => {
      const element = actionBar.element;
      expect(element?.getAttribute("role")).toBe("toolbar");
      expect(element?.getAttribute("aria-label")).toBe("Battle controls");
    });

    it("should have ARIA labels on all buttons", () => {
      const buttons = container.querySelectorAll("button");
      buttons.forEach((btn) => {
        expect(btn.getAttribute("aria-label")).toBeTruthy();
      });
    });

    it("should have data-testid attributes for testing", () => {
      const buttons = container.querySelectorAll("[data-action-button-type]");
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("should support focus management", () => {
      const btn = container.querySelector("button");
      btn?.focus();
      expect(document.activeElement).toBe(btn);
    });
  });
});
