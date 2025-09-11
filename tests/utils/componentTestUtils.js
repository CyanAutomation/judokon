/**
 * Component Test Utilities for Unit Testing
 *
 * Provides utilities for testing components with natural interactions
 * instead of synthetic DOM manipulation and event dispatching.
 *
 * @pseudocode
 * 1. Create component factories that use real initialization
 * 2. Provide natural interaction simulation helpers
 * 3. Enable direct component state inspection
 * 4. Offer cleanup utilities for test lifecycle management
 */

import { createCard } from "../../src/components/Card.js";
import { SidebarList } from "../../src/components/SidebarList.js";

/**
 * Natural click simulation that uses real event handlers
 * @param {HTMLElement} element - Element to click
 * @param {object} options - Click options
 */
export function naturalClick(element, options = {}) {
  if (!element || typeof element.click !== "function") {
    throw new Error("Element must have a click method");
  }

  // Use the element's actual click method instead of dispatchEvent
  element.click();

  // If the element has a specific event handler, we can also call it directly
  if (options.triggerHandler && element.onclick) {
    element.onclick(new Event("click"));
  }
}

/**
 * Natural keyboard simulation for accessibility testing
 * @param {HTMLElement} element - Element to send keys to
 * @param {string} key - Key to press (e.g., "Enter", "ArrowDown")
 * @param {object} options - Keyboard options
 */
export function naturalKeypress(element, key, options = {}) {
  if (!element) {
    throw new Error("Element is required for keyboard simulation");
  }

  // Create a real keyboard event
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...options
  });

  // Dispatch through the actual DOM event system
  element.dispatchEvent(event);

  // Also trigger keyup for completeness
  const keyupEvent = new KeyboardEvent("keyup", {
    key,
    bubbles: true,
    cancelable: true,
    ...options
  });

  element.dispatchEvent(keyupEvent);
}

/**
 * Create a Card component with test API access
 * @param {string|Node} content - Card content
 * @param {object} options - Card options
 * @returns {object} Card instance with test utilities
 */
export function createTestCard(content, options = {}) {
  const card = createCard(content, options);

  return {
    element: card,
    testApi: {
      getContent: () => card.textContent || card.innerHTML,
      click: () => naturalClick(card),
      hasClass: (className) => card.classList.contains(className),
      getAttribute: (attr) => card.getAttribute(attr),
      isVisible: () => !card.hidden && card.style.display !== "none",
      cleanup: () => {
        if (card.parentNode) {
          card.parentNode.removeChild(card);
        }
      }
    }
  };
}

/**
 * Create a SidebarList component with test API access
 * @param {Array} items - List items
 * @param {Function} onSelect - Selection callback
 * @returns {object} SidebarList instance with test utilities
 */
export function createTestSidebarList(items, onSelect) {
  const sidebarList = new SidebarList(items, onSelect);
  const { element } = sidebarList;

  return {
    element,
    instance: sidebarList,
    testApi: {
      selectItem: (index) => {
        const listItems = element.querySelectorAll("li");
        if (listItems[index]) {
          naturalClick(listItems[index]);
        }
      },
      navigateWithArrows: (direction) => {
        const key = direction === "down" ? "ArrowDown" : "ArrowUp";
        naturalKeypress(element, key);
      },
      getSelectedIndex: () => {
        const selected = element.querySelector("li.selected");
        if (!selected) return -1;
        return Array.from(element.querySelectorAll("li")).indexOf(selected);
      },
      getItemCount: () => element.querySelectorAll("li").length,
      isItemSelected: (index) => {
        const item = element.querySelectorAll("li")[index];
        return item ? item.classList.contains("selected") : false;
      },
      cleanup: () => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }
    }
  };
}

/**
 * Component state manager for testing
 */
export class ComponentTestManager {
  constructor() {
    this.components = new Map();
    this.eventListeners = new Map();
  }

  /**
   * Register a component for testing
   * @param {string} name - Component name
   * @param {object} component - Component instance
   */
  register(name, component) {
    this.components.set(name, component);
  }

  /**
   * Get component by name
   * @param {string} name - Component name
   * @returns {object|null} Component instance
   */
  get(name) {
    return this.components.get(name) || null;
  }

  /**
   * Register event listener for component
   * @param {string} componentName - Component name
   * @param {string} eventName - Event name
   * @param {Function} handler - Event handler
   */
  addEventHandler(componentName, eventName, handler) {
    if (!this.eventListeners.has(componentName)) {
      this.eventListeners.set(componentName, new Map());
    }
    this.eventListeners.get(componentName).set(eventName, handler);
  }

  /**
   * Trigger event on component
   * @param {string} componentName - Component name
   * @param {string} eventName - Event name
   * @param {any} data - Event data
   */
  triggerEvent(componentName, eventName, data) {
    const componentEvents = this.eventListeners.get(componentName);
    if (componentEvents && componentEvents.has(eventName)) {
      const handler = componentEvents.get(eventName);
      handler(data);
    }
  }

  /**
   * Cleanup all registered components
   */
  cleanup() {
    this.components.forEach((component) => {
      if (component.testApi && component.testApi.cleanup) {
        component.testApi.cleanup();
      }
    });
    this.components.clear();
    this.eventListeners.clear();
  }
}

/**
 * Create a test environment with component manager
 * @returns {object} Test environment with utilities
 */
export function createTestEnvironment() {
  const manager = new ComponentTestManager();

  return {
    manager,
    createCard: (content, options) => {
      const card = createTestCard(content, options);
      manager.register(`card_${Date.now()}`, card);
      return card;
    },
    createSidebarList: (items, onSelect) => {
      const list = createTestSidebarList(items, onSelect);
      manager.register(`list_${Date.now()}`, list);
      return list;
    },
    cleanup: () => manager.cleanup()
  };
}

/**
 * Natural interaction utilities
 */
export const interactions = {
  click: naturalClick,
  keypress: naturalKeypress,

  /**
   * Simulate focus on element
   * @param {HTMLElement} element - Element to focus
   */
  focus: (element) => {
    if (element && typeof element.focus === "function") {
      element.focus();
    }
  },

  /**
   * Simulate blur on element
   * @param {HTMLElement} element - Element to blur
   */
  blur: (element) => {
    if (element && typeof element.blur === "function") {
      element.blur();
    }
  },

  /**
   * Wait for element to be available
   * @param {Function} selector - Function that returns element or null
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<HTMLElement>} Element when available
   */
  async waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const check = () => {
        const element = selector();
        if (element) {
          resolve(element);
          return;
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error("Element not found within timeout"));
          return;
        }

        setTimeout(check, 50);
      };

      check();
    });
  }
};

/**
 * Console handling utilities for consistent test patterns
 */
export const consoleUtils = {
  /**
   * Check if a test function properly handles console output
   * @param {Function} testFn - Test function to run
   * @returns {Promise<object>} Result with any console calls detected
   */
  async checkConsoleCleanness(testFn) {
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      debug: console.debug
    };

    const consoleCalls = {
      log: [],
      warn: [],
      error: [],
      debug: []
    };

    // Intercept console calls
    console.log = (...args) => consoleCalls.log.push(args);
    console.warn = (...args) => consoleCalls.warn.push(args);
    console.error = (...args) => consoleCalls.error.push(args);
    console.debug = (...args) => consoleCalls.debug.push(args);

    try {
      await testFn();
    } finally {
      // Restore console
      Object.assign(console, originalConsole);
    }

    return {
      hasConsoleCalls: Object.values(consoleCalls).some((calls) => calls.length > 0),
      calls: consoleCalls
    };
  }
};
