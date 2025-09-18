/**
 * Enhanced cleanup utilities for managing resources in battle flows.
 *
 * This module provides comprehensive cleanup mechanisms for different types
 * of resources including event listeners, timers, DOM elements, and module caches.
 */

/**
 * Resource cleanup registry for tracking and disposing of resources.
 */
class ResourceRegistry {
  constructor() {
    this.resources = new Map();
    this.disposed = false;
  }

  /**
   * Register a cleanup function for a specific resource type.
   *
   * @param {string} type - Resource type (e.g., 'eventListener', 'timer', 'dom')
   * @param {Function} cleanupFn - Function to call when cleaning up
   * @param {string} [id] - Optional identifier for the resource
   */
  register(type, cleanupFn, id) {
    if (this.disposed) return;

    if (!this.resources.has(type)) {
      this.resources.set(type, new Map());
    }

    const typeMap = this.resources.get(type);
    const resourceId = id || Symbol("resource");
    typeMap.set(resourceId, cleanupFn);
  }

  /**
   * Unregister a specific resource.
   *
   * @param {string} type - Resource type
   * @param {string} id - Resource identifier
   */
  unregister(type, id) {
    if (!this.resources.has(type)) return;
    this.resources.get(type).delete(id);
  }

  /**
   * Clean up all resources of a specific type.
   *
   * @param {string} type - Resource type to clean up
   */
  cleanupType(type) {
    if (!this.resources.has(type)) return;

    const typeMap = this.resources.get(type);
    for (const cleanupFn of typeMap.values()) {
      try {
        cleanupFn();
      } catch (error) {
        console.warn(`Failed to cleanup ${type} resource:`, error);
      }
    }
    typeMap.clear();
  }

  /**
   * Clean up all resources.
   */
  cleanupAll() {
    if (this.disposed) return;

    for (const [type] of this.resources) {
      this.cleanupType(type);
    }
    this.resources.clear();
    this.disposed = true;
  }

  /**
   * Check if registry has been disposed.
   *
   * @returns {boolean} True if disposed
   */
  isDisposed() {
    return this.disposed;
  }
}

/**
 * Create a new resource registry.
 *
 * @returns {ResourceRegistry} New resource registry instance
 */
export function createResourceRegistry() {
  return new ResourceRegistry();
}

/**
 * Enhanced cleanup function that handles multiple resource types.
 *
 * @param {Array<() => void>} cleanupFns - Array of cleanup functions
 * @param {ResourceRegistry} [registry] - Optional resource registry
 * @returns {() => void} Cleanup function
 */
export function createEnhancedCleanup(cleanupFns = [], registry) {
  return () => {
    // Clean up individual functions
    while (cleanupFns.length) {
      const dispose = cleanupFns.pop();
      try {
        dispose?.();
      } catch (error) {
        console.warn("Failed to cleanup function:", error);
      }
    }

    // Clean up registry if provided
    if (registry && !registry.isDisposed()) {
      registry.cleanupAll();
    }
  };
}

/**
 * Timer cleanup utilities.
 */
export const timerCleanup = {
  /**
   * Register a timeout for cleanup.
   *
   * @param {ResourceRegistry} registry - Resource registry
   * @param {ReturnType<typeof setTimeout>} timeoutId - Timeout ID
   * @param {string} [id] - Optional identifier
   */
  registerTimeout(registry, timeoutId, id) {
    if (!timeoutId) return;
    registry.register("timer", () => clearTimeout(timeoutId), id);
  },

  /**
   * Register an interval for cleanup.
   *
   * @param {ResourceRegistry} registry - Resource registry
   * @param {ReturnType<typeof setInterval>} intervalId - Interval ID
   * @param {string} [id] - Optional identifier
   */
  registerInterval(registry, intervalId, id) {
    if (!intervalId) return;
    registry.register("timer", () => clearInterval(intervalId), id);
  },

  /**
   * Clean up all timers.
   *
   * @param {ResourceRegistry} registry - Resource registry
   */
  cleanupAllTimers(registry) {
    registry.cleanupType("timer");
  }
};

/**
 * Event listener cleanup utilities.
 */
export const eventCleanup = {
  /**
   * Register an event listener for cleanup.
   *
   * @param {ResourceRegistry} registry - Resource registry
   * @param {EventTarget} target - Event target
   * @param {string} type - Event type
   * @param {Function} listener - Event listener
   * @param {string} [id] - Optional identifier
   */
  registerListener(registry, target, type, listener, id) {
    registry.register(
      "eventListener",
      () => {
        try {
          target.removeEventListener(type, listener);
        } catch (error) {
          console.warn(`Failed to remove event listener ${type}:`, error);
        }
      },
      id
    );
  },

  /**
   * Clean up all event listeners.
   *
   * @param {ResourceRegistry} registry - Resource registry
   */
  cleanupAllListeners(registry) {
    registry.cleanupType("eventListener");
  }
};

/**
 * DOM cleanup utilities.
 */
export const domCleanup = {
  /**
   * Register a DOM element for cleanup.
   *
   * @param {ResourceRegistry} registry - Resource registry
   * @param {Element} element - DOM element
   * @param {string} [id] - Optional identifier
   */
  registerElement(registry, element, id) {
    registry.register(
      "dom",
      () => {
        try {
          if (element.parentNode) {
            element.parentNode.removeChild(element);
          }
        } catch (error) {
          console.warn("Failed to remove DOM element:", error);
        }
      },
      id
    );
  },

  /**
   * Clean up all DOM elements.
   *
   * @param {ResourceRegistry} registry - Resource registry
   */
  cleanupAllElements(registry) {
    registry.cleanupType("dom");
  }
};

/**
 * Module cache cleanup utilities.
 */
export const moduleCleanup = {
  /**
   * Register a module cache for cleanup.
   *
   * @param {ResourceRegistry} registry - Resource registry
   * @param {Map} cache - Module cache map
   * @param {string} [id] - Optional identifier
   */
  registerCache(registry, cache, id) {
    registry.register(
      "moduleCache",
      () => {
        try {
          cache.clear();
        } catch (error) {
          console.warn("Failed to clear module cache:", error);
        }
      },
      id
    );
  },

  /**
   * Clean up all module caches.
   *
   * @param {ResourceRegistry} registry - Resource registry
   */
  cleanupAllCaches(registry) {
    registry.cleanupType("moduleCache");
  }
};

/**
 * Memory leak prevention utilities.
 */
export const memoryCleanup = {
  /**
   * Clear object references to prevent memory leaks.
   *
   * @param {object} obj - Object to clear references from
   * @param {string[]} [properties] - Specific properties to clear (all if not specified)
   */
  clearReferences(obj, properties) {
    if (!obj || typeof obj !== "object") return;

    const propsToClear = properties || Object.keys(obj);

    for (const prop of propsToClear) {
      try {
        if (prop in obj) {
          obj[prop] = null;
        }
      } catch (error) {
        console.warn(`Failed to clear reference ${prop}:`, error);
      }
    }
  },

  /**
   * Register an object for reference clearing.
   *
   * @param {ResourceRegistry} registry - Resource registry
   * @param {object} obj - Object to clear references from
   * @param {string[]} [properties] - Specific properties to clear
   * @param {string} [id] - Optional identifier
   */
  registerReferenceCleanup(registry, obj, properties, id) {
    registry.register(
      "reference",
      () => {
        memoryCleanup.clearReferences(obj, properties);
      },
      id
    );
  }
};
