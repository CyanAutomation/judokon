/**
 * Structured battle debug logger with console discipline compliance
 *
 * Provides comprehensive logging for battle debugging while maintaining:
 * - Zero console violations in tests
 * - Zero performance impact in production
 * - Memory-efficient buffering
 * - Structured log querying capabilities
 *
 * @pseudocode
 * 1. Create configurable logger with category-based filtering
 * 2. Use memory buffer for all environments to avoid console pollution
 * 3. Provide controlled console output only in development with explicit flags
 * 4. Support structured querying and log analysis
 */

/**
 * Categories for battle debug logging
 */
export const DEBUG_CATEGORIES = {
  STATE: "state",
  EVENT: "event",
  TIMER: "timer",
  ERROR: "error",
  PERFORMANCE: "performance",
  UI: "ui",
  NETWORK: "network"
};

/**
 * Log levels for filtering and display
 */
export const LOG_LEVELS = {
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn",
  ERROR: "error"
};

/**
 * Core battle debug logger class
 */
export class BattleDebugLogger {
  /**
   * Initialize debug logger with configuration options
   *
   * @param {object} options - Logger configuration
   * @param {boolean} options.enabled - Force enable/disable logging
   * @param {string[]} options.categories - Categories to log (default: all)
   * @param {string} options.outputMode - Output mode: 'console', 'memory', 'both'
   * @param {number} options.maxBufferSize - Max entries in memory buffer
   * @param {string} options.minLevel - Minimum log level to capture
   */
  constructor(options = {}) {
    this.enabled = this.shouldEnable(options);
    this.categories = new Set(options.categories || Object.values(DEBUG_CATEGORIES));
    this.outputMode = this.getOutputMode(options);
    this.buffer = [];
    this.maxBufferSize = options.maxBufferSize || 1000;
    this.minLevel = options.minLevel || LOG_LEVELS.DEBUG;
    this.startTime = Date.now();

    // Level priority for filtering
    this.levelPriority = {
      [LOG_LEVELS.DEBUG]: 0,
      [LOG_LEVELS.INFO]: 1,
      [LOG_LEVELS.WARN]: 2,
      [LOG_LEVELS.ERROR]: 3
    };
  }

  /**
   * Determine if logging should be enabled
   *
   * @param {object} options - Logger options
   * @returns {boolean} True if logging should be enabled
   */
  shouldEnable(options) {
    if (options.enabled !== undefined) return options.enabled;

    // Check environment variables
    if (typeof process !== "undefined" && process.env && process.env.DEBUG_BATTLE) return true;

    // Check URL parameters in browser
    if (typeof window !== "undefined") {
      const url = new URL(window.location);
      if (url.searchParams.has("debugBattle")) return true;
    }

    // Default: enabled in development, disabled in production/tests
    return typeof process !== "undefined" && process.env && process.env.NODE_ENV === "development";
  }

  /**
   * Determine output mode based on environment
   */
  getOutputMode(options) {
    if (options.outputMode) return options.outputMode;

    // Never output to console in tests to maintain console discipline
    if (typeof process !== "undefined" && process.env && process.env.VITEST) {
      return "memory";
    }
    if (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "test") {
      return "memory";
    }

    // Production mode: memory only
    if (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "production") {
      return "memory";
    }

    // Development: both memory and console
    return "both";
  }

  /**
   * Log a message with category and level
   *
   * @param {string} category - Log category from DEBUG_CATEGORIES
   * @param {string} level - Log level from LOG_LEVELS
   * @param {string} message - Log message
   * @param {object} data - Additional structured data
   * @returns {void}
   */
  log(category, level, message, data = {}) {
    if (!this.enabled) return;
    if (!this.categories.has(category)) return;
    if (this.levelPriority[level] < this.levelPriority[this.minLevel]) return;

    const entry = {
      id: this.generateId(),
      timestamp: Date.now(),
      relativeTime: Date.now() - this.startTime,
      category,
      level,
      message,
      data: this.sanitizeData(data),
      stack: this.captureStack()
    };

    this.addToBuffer(entry);

    if (this.outputMode === "console" || this.outputMode === "both") {
      this.outputToConsole(entry);
    }
  }

  /**
   * Add entry to memory buffer with size management
   *
   * @param {object} entry - Log entry
   * @returns {void}
   */
  addToBuffer(entry) {
    this.buffer.push(entry);

    // Maintain buffer size limit
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer = this.buffer.slice(-this.maxBufferSize);
    }
  }

  /**
   * Output log entry to console (only in development)
   *
   * @param {object} entry - Log entry
   * @returns {void}
   */
  outputToConsole(entry) {
    const prefix = `[${entry.category.toUpperCase()}] ${entry.relativeTime}ms`;
    const message = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case LOG_LEVELS.ERROR:
        console.error(message, entry.data);
        break;
      case LOG_LEVELS.WARN:
        console.warn(message, entry.data);
        break;
      case LOG_LEVELS.INFO:
        console.info(message, entry.data);
        break;
      default:
        console.log(message, entry.data);
    }
  }

  /**
   * Sanitize data for logging (remove circular references, limit depth)
   *
   * @param {any} data - Data to sanitize
   * @returns {any} Sanitized data
   */
  sanitizeData(data) {
    try {
      return JSON.parse(JSON.stringify(data, this.replacer, 2));
    } catch {
      return { error: "Failed to serialize data", original: String(data) };
    }
  }

  /**
   * JSON replacer to handle circular references and functions
   *
   * @param {string} key - Object key
   * @param {any} value - Object value
   * @returns {any} Replacement value
   */
  replacer(key, value) {
    if (typeof value === "function") {
      return `[Function: ${value.name || "anonymous"}]`;
    }
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack
      };
    }
    return value;
  }

  /**
   * Capture stack trace for debugging
   *
   * @returns {string} Stack trace string
   */
  captureStack() {
    const stack = new Error().stack;
    if (!stack) return "";

    // Remove logger internal calls from stack
    const lines = stack.split("\n");
    return lines.slice(3, 6).join("\n"); // Keep 3 relevant stack frames
  }

  /**
   * Generate unique ID for log entries
   *
   * @returns {string} Unique ID
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Query logs with filtering options
   *
   * @param {object} filters - Query filters
   * @param {string[]} filters.categories - Categories to include
   * @param {string[]} filters.levels - Levels to include
   * @param {number} filters.since - Timestamp to filter from
   * @param {number} filters.limit - Max results to return
   * @returns {object[]} Filtered log entries
   */
  query(filters = {}) {
    let results = [...this.buffer];

    if (filters.categories) {
      const categorySet = new Set(filters.categories);
      results = results.filter((entry) => categorySet.has(entry.category));
    }

    if (filters.levels) {
      const levelSet = new Set(filters.levels);
      results = results.filter((entry) => levelSet.has(entry.level));
    }

    if (filters.since) {
      results = results.filter((entry) => entry.timestamp >= filters.since);
    }

    if (filters.message) {
      const regex = new RegExp(filters.message, "i");
      results = results.filter((entry) => regex.test(entry.message));
    }

    // Sort by timestamp (newest first)
    results.sort((a, b) => b.timestamp - a.timestamp);

    if (filters.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * Get summary statistics about logged entries
   *
   * @returns {object} Log statistics
   */
  getStats() {
    const stats = {
      totalEntries: this.buffer.length,
      categories: {},
      levels: {},
      timeRange: {
        first: null,
        last: null,
        duration: 0
      }
    };

    if (this.buffer.length === 0) return stats;

    this.buffer.forEach((entry) => {
      // Count by category
      stats.categories[entry.category] = (stats.categories[entry.category] || 0) + 1;

      // Count by level
      stats.levels[entry.level] = (stats.levels[entry.level] || 0) + 1;
    });

    // Time range
    const timestamps = this.buffer.map((entry) => entry.timestamp);
    stats.timeRange.first = Math.min(...timestamps);
    stats.timeRange.last = Math.max(...timestamps);
    stats.timeRange.duration = stats.timeRange.last - stats.timeRange.first;

    return stats;
  }

  /**
   * Clear all logged entries
   *
   * @returns {void}
   */
  clear() {
    this.buffer = [];
    this.startTime = Date.now();
  }

  /**
   * Export logs as JSON string
   *
   * @param {object} filters - Optional filters to apply
   * @returns {string} JSON representation of logs
   */
  export(filters = {}) {
    const logs = this.query(filters);
    return JSON.stringify(
      {
        exported: Date.now(),
        stats: this.getStats(),
        logs
      },
      null,
      2
    );
  }
}

/**
 * Default logger instance for battle debugging
 * Explicitly enabled for testing and development use
 */
export const debugLogger = new BattleDebugLogger({
  enabled:
    (typeof process !== "undefined" && process.env && process.env.VITEST) ||
    (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "development")
});

/**
 * Convenience methods for common logging scenarios
 */

/**
 * Log state machine transitions
 *
 * @param {string} from - Previous state
 * @param {string} to - Next state
 * @param {string} trigger - Transition trigger
 * @param {object} context - Additional context
 * @returns {void}
 */
export function logStateTransition(from, to, trigger, context = {}) {
  debugLogger.log(
    DEBUG_CATEGORIES.STATE,
    LOG_LEVELS.INFO,
    `Transition: ${from} → ${to} (${trigger})`,
    { from, to, trigger, ...context }
  );
}

/**
 * Log event emissions
 *
 * @param {string} eventName - Event name
 * @param {any} payload - Event payload
 * @param {object} context - Additional context
 * @returns {void}
 */
export function logEventEmit(eventName, payload, context = {}) {
  debugLogger.log(DEBUG_CATEGORIES.EVENT, LOG_LEVELS.INFO, `Event emitted: ${eventName}`, {
    eventName,
    payload,
    ...context
  });
}

/**
 * Log timer operations
 *
 * @param {string} operation - Timer operation (start, stop, expired)
 * @param {string} name - Timer name
 * @param {number} duration - Timer duration (for start operations)
 * @param {object} context - Additional context
 * @returns {void}
 */
export function logTimerOperation(operation, name, duration, context = {}) {
  debugLogger.log(DEBUG_CATEGORIES.TIMER, LOG_LEVELS.INFO, `Timer ${operation}: ${name}`, {
    operation,
    name,
    duration,
    ...context
  });
}

/**
 * Log errors with stack traces
 *
 * @param {string} message - Error message
 * @param {Error} error - Error object
 * @param {object} context - Additional context
 * @returns {void}
 */
export function logError(message, error, context = {}) {
  debugLogger.log(DEBUG_CATEGORIES.ERROR, LOG_LEVELS.ERROR, message, { error, ...context });
}

/**
 * Log performance measurements
 *
 * @param {string} operation - Operation name
 * @param {number} duration - Duration in milliseconds
 * @param {object} context - Additional context
 * @returns {void}
 */
export function logPerformance(operation, duration, context = {}) {
  debugLogger.log(
    DEBUG_CATEGORIES.PERFORMANCE,
    LOG_LEVELS.INFO,
    `Performance: ${operation} took ${duration}ms`,
    { operation, duration, ...context }
  );
}

// Battle System Integration Helpers

/**
 * Log state handler entry with timing and context.
 * @pseudocode
 * 1. Log when entering a state handler
 * 2. Include store state and handler context
 */
export function logStateHandlerEnter(handlerName, state, data = {}) {
  debugLogger.log("state", "debug", `Handler Enter: ${handlerName}`, {
    handler: handlerName,
    state,
    timestamp: Date.now(),
    ...data
  });
}

/**
 * Log state handler exit with timing and results.
 * @pseudocode
 * 1. Log when exiting a state handler
 * 2. Include any results or next actions
 */
export function logStateHandlerExit(handlerName, results = {}, data = {}) {
  debugLogger.log("state", "debug", `Handler Exit: ${handlerName}`, {
    handler: handlerName,
    results,
    timestamp: Date.now(),
    ...data
  });
}

/**
 * Log UI events and interactions.
 * @pseudocode
 * 1. Log UI events like button clicks, state changes
 * 2. Include user interaction context
 */
export function logUIInteraction(interaction, element, data = {}) {
  debugLogger.log("ui", "info", `UI: ${interaction}`, {
    interaction,
    element,
    timestamp: Date.now(),
    ...data
  });
}

/**
 * Log battle errors with enhanced context.
 * @pseudocode
 * 1. Log errors with context about where they occurred
 * 2. Include stack trace and error details
 */
export function logBattleError(error, context, data = {}) {
  debugLogger.log("error", "error", `Battle Error in ${context}`, {
    error: error.message || error,
    stack: error.stack,
    context,
    ...data
  });
}

/**
 * Create a logger instance for a specific battle component.
 * @pseudocode
 * 1. Create logger scoped to a specific component
 * 2. Enable easy identification of log source
 */
export function createComponentLogger(componentName) {
  return {
    info: (message, data = {}) =>
      debugLogger.log("state", "info", `[${componentName}] ${message}`, data),
    debug: (message, data = {}) =>
      debugLogger.log("state", "debug", `[${componentName}] ${message}`, data),
    error: (message, data = {}) =>
      debugLogger.log("error", "error", `[${componentName}] ${message}`, data),
    timer: (operation, name, duration, data = {}) =>
      logTimerOperation(operation, name, duration, { component: componentName, ...data }),
    event: (eventName, payload, data = {}) =>
      logEventEmit(eventName, payload, { component: componentName, ...data }),
    ui: (interaction, element, data = {}) =>
      logUIInteraction(interaction, element, { component: componentName, ...data })
  };
}
