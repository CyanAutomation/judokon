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
  },

  /**
   * Simulate natural keyboard navigation
   * @param {HTMLElement} element - Target element
   * @param {string} key - Key to press ('ArrowLeft', 'ArrowRight', etc.)
   * @param {object} options - Additional options
   */
  naturalKeyboardNavigation: (element, key, options = {}) => {
    if (!element) return;

    // Focus the element first (natural behavior)
    element.focus();

    // Create and dispatch a realistic keyboard event
    const event = new KeyboardEvent("keydown", {
      key,
      code: key,
      bubbles: true,
      cancelable: true,
      composed: true,
      target: element,
      ...options
    });

    element.dispatchEvent(event);
  },

  /**
   * Simulate natural swipe gesture
   * @param {HTMLElement} element - Target element
   * @param {string} direction - 'left' or 'right'
   * @param {number} distance - Swipe distance in pixels
   * @param {object} options - Additional options
   */
  naturalSwipe: (element, direction, distance = 100, options = {}) => {
    if (!element) return;

    const startX = direction === "left" ? distance : 0;
    const endX = direction === "left" ? 0 : distance;

    // TouchStart
    const touchStart = new TouchEvent("touchstart", {
      bubbles: true,
      cancelable: true,
      touches: [
        {
          clientX: startX,
          clientY: 0,
          target: element
        }
      ],
      ...options
    });

    element.dispatchEvent(touchStart);

    // Small delay to simulate realistic gesture
    setTimeout(() => {
      // TouchEnd
      const touchEnd = new TouchEvent("touchend", {
        bubbles: true,
        cancelable: true,
        changedTouches: [
          {
            clientX: endX,
            clientY: 0,
            target: element
          }
        ],
        ...options
      });

      element.dispatchEvent(touchEnd);
    }, 10);
  },

  /**
   * Simulate natural pointer gesture
   * @param {HTMLElement} element - Target element
   * @param {string} direction - 'left' or 'right'
   * @param {number} distance - Gesture distance in pixels
   * @param {object} options - Additional options
   */
  naturalPointerGesture: (element, direction, distance = 100, options = {}) => {
    if (!element) return;

    const startX = direction === "left" ? distance : 0;
    const endX = direction === "left" ? 0 : distance;

    // PointerDown
    const pointerDown = new PointerEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      clientX: startX,
      clientY: 0,
      pointerType: "touch",
      ...options
    });

    element.dispatchEvent(pointerDown);

    // Small delay to simulate realistic gesture
    setTimeout(() => {
      // PointerUp
      const pointerUp = new PointerEvent("pointerup", {
        bubbles: true,
        cancelable: true,
        clientX: endX,
        clientY: 0,
        pointerType: "touch",
        ...options
      });

      element.dispatchEvent(pointerUp);
    }, 10);
  },

  /**
   * Simulate natural document ready state change
   * @param {string} readyState - 'loading', 'interactive', or 'complete'
   * @param {boolean} fireEvent - Whether to fire DOMContentLoaded event
   */
  naturalDocumentReady: (readyState = "complete", fireEvent = true) => {
    // Change document ready state naturally
    Object.defineProperty(document, "readyState", {
      value: readyState,
      configurable: true
    });

    if (fireEvent && readyState === "complete") {
      // Fire DOMContentLoaded in a natural way
      setTimeout(() => {
        document.dispatchEvent(
          new Event("DOMContentLoaded", {
            bubbles: true,
            cancelable: false
          })
        );
      }, 0);
    }
  }
};

/**
 * Create a CarouselController component with test API access
 * @param {object} options - Carousel options
 * @returns {object} CarouselController instance with test utilities
 */
export function createTestCarousel(options = {}) {
  // Create real DOM structure
  const container = document.createElement("div");
  const wrapper = document.createElement("div");

  // Mock scrollTo function
  container.scrollTo = vi.fn((opts) => {
    if (typeof opts === "object") container.scrollLeft = opts.left ?? 0;
    else container.scrollLeft = opts || 0;
  });

  // Set up realistic dimensions
  Object.defineProperty(container, "clientWidth", {
    value: options.clientWidth || 100,
    configurable: true
  });
  Object.defineProperty(container, "scrollWidth", {
    value: options.scrollWidth || 300,
    configurable: true
  });
  container.scrollLeft = 0;

  // Import CarouselController dynamically
  let CarouselController;
  let controller;

  return {
    element: container,
    wrapper,
    testApi: {
      async initialize() {
        // Import and initialize controller
        const module = await import("../../src/helpers/carousel/controller.js");
        CarouselController = module.CarouselController;
        controller = new CarouselController(container, wrapper);
        return controller;
      },

      // Natural interaction methods
      pressArrowKey: (direction) => {
        const key = direction === "left" ? "ArrowLeft" : "ArrowRight";
        interactions.naturalKeyboardNavigation(container, key);
      },

      swipeGesture: async (direction, distance = 100) => {
        return new Promise((resolve) => {
          interactions.naturalSwipe(container, direction, distance);
          // Wait for gesture to complete
          setTimeout(resolve, 20);
        });
      },

      pointerGesture: async (direction, distance = 100) => {
        return new Promise((resolve) => {
          interactions.naturalPointerGesture(container, direction, distance);
          // Wait for gesture to complete
          setTimeout(resolve, 20);
        });
      },

      // Trigger scroll events naturally
      simulateScroll: (scrollLeft) => {
        container.scrollLeft = scrollLeft;
        container.dispatchEvent(new Event("scroll"));
      },

      simulateScrollEnd: () => {
        container.dispatchEvent(new Event("scrollend"));
      },

      // Cancel events simulation
      triggerCancel: () => {
        container.dispatchEvent(new TouchEvent("touchcancel"));
        container.dispatchEvent(new PointerEvent("pointercancel"));
      },

      // State access
      getCurrentPage: () => controller?.currentPage ?? 0,
      getPageCounter: () => wrapper.querySelector(".page-counter")?.textContent,

      // Controller methods
      setPage: (page) => controller?.setPage(page),
      next: () => controller?.next(),
      prev: () => controller?.prev(),
      destroy: () => controller?.destroy(),

      // Spying utilities
      spyOnMethod: (methodName) => {
        if (controller && typeof controller[methodName] === "function") {
          return vi.spyOn(controller, methodName);
        }
        return null;
      },

      cleanup: () => {
        if (controller) {
          controller.destroy();
        }
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      }
    }
  };
}

/**
 * Create a MockupViewer component with test API access
 * @param {object} options - MockupViewer options
 * @returns {object} MockupViewer instance with test utilities
 */
export function createTestMockupViewer() {
  // Create real DOM structure instead of synthetic markup
  const container = document.createElement("div");
  container.innerHTML = `
    <ul id="mockup-list"></ul>
    <img id="mockup-image" />
    <div id="mockup-filename"></div>
    <button id="prev-btn">Prev</button>
    <button id="next-btn">Next</button>
  `;

  // Append to document for real initialization
  document.body.appendChild(container);

  return {
    element: container,
    testApi: {
      async initialize() {
        // Use real component initialization
        globalThis.SKIP_MOCKUP_AUTO_INIT = true;
        const { setupMockupViewerPage } = await import("../../src/helpers/mockupViewerPage.js");
        await setupMockupViewerPage();
      },
      getImageList: () => container.querySelector("#mockup-list"),
      getCurrentImage: () => container.querySelector("#mockup-image"),
      getFilenameDisplay: () => container.querySelector("#mockup-filename"),
      getPrevButton: () => container.querySelector("#prev-btn"),
      getNextButton: () => container.querySelector("#next-btn"),
      navigateNext: () => {
        const nextBtn = container.querySelector("#next-btn");
        naturalClick(nextBtn);
      },
      navigatePrev: () => {
        const prevBtn = container.querySelector("#prev-btn");
        naturalClick(prevBtn);
      },
      selectImage: (index) => {
        const listItems = container.querySelectorAll("#mockup-list li");
        if (listItems[index]) {
          naturalClick(listItems[index]);
        }
      },
      getSelectedIndex: () => {
        const selected = container.querySelector("#mockup-list li.selected");
        if (!selected) return -1;
        return Array.from(container.querySelectorAll("#mockup-list li")).indexOf(selected);
      },
      getImageCount: () => container.querySelectorAll("#mockup-list li").length,
      getCurrentImageSrc: () => container.querySelector("#mockup-image").src,
      cleanup: () => {
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      }
    }
  };
}

/**
 * Create a PrdReader component with test API access
 * @param {object} docs - Document map
 * @param {Function} parser - Markdown parser function
 * @returns {object} PrdReader instance with test utilities
 */
export function createTestPrdReader(docs, parser) {
  // Create real DOM structure instead of synthetic markup
  const container = document.createElement("div");
  container.innerHTML = `
    <div id="prd-title"></div>
    <div id="task-summary"></div>
    <ul id="prd-list"></ul>
    <div id="prd-content" tabindex="0"></div>
    <button data-nav="prev">Prev</button>
    <button data-nav="next">Next</button>
    <button data-nav="prev">Prev bottom</button>
    <button data-nav="next">Next bottom</button>
  `;

  // Append to document for real initialization
  document.body.appendChild(container);

  return {
    element: container,
    testApi: {
      async initialize() {
        // Use real component initialization
        globalThis.SKIP_PRD_AUTO_INIT = true;
        const { setupPrdReaderPage } = await import("../../src/helpers/prdReaderPage.js");
        await setupPrdReaderPage(docs, parser);
      },
      getContentContainer: () => container.querySelector("#prd-content"),
      getDocumentList: () => container.querySelector("#prd-list"),
      getTitleElement: () => container.querySelector("#prd-title"),
      getTaskSummary: () => container.querySelector("#task-summary"),
      getNextButtons: () => container.querySelectorAll('[data-nav="next"]'),
      getPrevButtons: () => container.querySelectorAll('[data-nav="prev"]'),
      navigateNext: () => {
        const nextBtn = container.querySelector('[data-nav="next"]');
        naturalClick(nextBtn);
      },
      navigatePrev: () => {
        const prevBtn = container.querySelector('[data-nav="prev"]');
        naturalClick(prevBtn);
      },
      selectDocument: (index) => {
        const listItems = container.querySelectorAll("#prd-list li");
        if (listItems[index]) {
          naturalClick(listItems[index]);
        }
      },
      navigateWithKeyboard: (key) => {
        const list = container.querySelector("#prd-list");
        naturalKeypress(list, key);
      },
      getCurrentContent: () => container.querySelector("#prd-content").innerHTML,
      getCurrentTitle: () => container.querySelector("#prd-title").textContent,
      getSelectedIndex: () => {
        const selected = container.querySelector("#prd-list li.selected");
        if (!selected) return -1;
        return Array.from(container.querySelectorAll("#prd-list li")).indexOf(selected);
      },
      getDocumentCount: () => container.querySelectorAll("#prd-list li").length,
      cleanup: () => {
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      }
    }
  };
}

/**
 * Create a TooltipViewer component with test API access
 * @param {object} tooltipData - Tooltip data object
 * @returns {object} TooltipViewer instance with test utilities
 */
export function createTestTooltipViewer(tooltipData = {}) {
  // Create real DOM structure instead of synthetic markup
  const container = document.createElement("div");
  container.innerHTML = `
    <input id="tooltip-search" />
    <ul id="tooltip-list"></ul>
    <div id="tooltip-preview"></div>
    <div id="tooltip-warning"></div>
    <pre id="tooltip-raw"></pre>
    <button id="copy-key-btn"></button>
    <button id="copy-body-btn"></button>
  `;

  // Append to document for real initialization
  document.body.appendChild(container);

  return {
    element: container,
    testApi: {
      async initialize() {
        // Use real component initialization
        const mod = await import("../../src/helpers/tooltipViewerPage.js");
        mod.setTooltipDataLoader(async () => tooltipData);

        // Set up DOM ready state for initialization
        Object.defineProperty(document, "readyState", {
          value: "loading",
          configurable: true
        });

        await mod.setupTooltipViewerPage();
      },
      getSearchInput: () => container.querySelector("#tooltip-search"),
      getTooltipList: () => container.querySelector("#tooltip-list"),
      getPreviewElement: () => container.querySelector("#tooltip-preview"),
      getWarningElement: () => container.querySelector("#tooltip-warning"),
      getRawElement: () => container.querySelector("#tooltip-raw"),
      getCopyKeyButton: () => container.querySelector("#copy-key-btn"),
      getCopyBodyButton: () => container.querySelector("#copy-body-btn"),
      selectTooltip: (index) => {
        const listItems = container.querySelectorAll("#tooltip-list li");
        if (listItems[index]) {
          naturalClick(listItems[index]);
        }
      },
      searchTooltips: (term) => {
        const searchInput = container.querySelector("#tooltip-search");
        searchInput.value = term;
        searchInput.dispatchEvent(new Event("input"));
      },
      copyKey: () => {
        const copyBtn = container.querySelector("#copy-key-btn");
        naturalClick(copyBtn);
      },
      copyBody: () => {
        const copyBtn = container.querySelector("#copy-body-btn");
        naturalClick(copyBtn);
      },
      getCurrentPreview: () => container.querySelector("#tooltip-preview").innerHTML,
      isWarningVisible: () => !container.querySelector("#tooltip-warning").hidden,
      getWarningText: () => container.querySelector("#tooltip-warning").textContent,
      getTooltipCount: () => container.querySelectorAll("#tooltip-list li").length,
      cleanup: () => {
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      }
    }
  };
}

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
