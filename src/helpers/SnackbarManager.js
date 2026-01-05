/**
 * Snackbar Lifecycle Manager
 *
 * Manages the complete lifecycle of snackbar messages with:
 * - Priority-based display (high/normal/low)
 * - Guaranteed minimum display duration
 * - Queuing system for overlapping messages
 * - Coordination with battle flow timing
 *
 * @pseudocode
 * 1. Accept messages with priority and duration requirements
 * 2. Queue messages if higher priority message is active
 * 3. Enforce minimum display duration before removal
 * 4. Coordinate with battle state for proper timing
 * 5. Provide programmatic control over message lifecycle
 */

/**
 * Priority levels for snackbar messages
 * @enum {string}
 */
export const SnackbarPriority = {
  HIGH: "high", // Battle-critical messages (opponent choosing, round outcomes)
  NORMAL: "normal", // Standard messages (countdown, hints)
  LOW: "low" // Non-critical messages (general info)
};

/**
 * Snackbar message configuration
 * @typedef {Object} SnackbarConfig
 * @property {string} message - Text content to display
 * @property {SnackbarPriority} [priority='normal'] - Message priority level
 * @property {number} [minDuration=0] - Minimum display duration in milliseconds
 * @property {number} [autoDismiss=3000] - Auto-dismiss timeout (0 = manual dismiss only)
 * @property {Function} [onShow] - Callback when message appears
 * @property {Function} [onDismiss] - Callback when message is dismissed
 */

/**
 * Active snackbar entry
 * @typedef {Object} ActiveSnackbar
 * @property {string} id - Unique identifier
 * @property {string} message - Message text
 * @property {SnackbarPriority} priority - Priority level
 * @property {number} minDuration - Minimum display duration
 * @property {number} shownAt - Timestamp when displayed
 * @property {number} sequence - Monotonic sequence number for deterministic ordering
 * @property {HTMLElement} element - DOM element
 * @property {number} [autoDismissId] - Timeout ID for auto-dismiss
 * @property {Function} [onShow] - Show callback
 * @property {Function} [onDismiss] - Dismiss callback
 */

class SnackbarManager {
  constructor() {
    /** @type {Map<string, ActiveSnackbar>} */
    this.activeSnackbars = new Map();

    /** @type {Array<{id: string, config: SnackbarConfig}>} */
    this.queue = [];

    /** @type {number} */
    this.nextId = 0;

    /** @type {number} - Monotonic counter for deterministic ordering */
    this.sequenceCounter = 0;

    /** @type {SnackbarPriority|null} */
    this.currentPriority = null;

    /** @type {number} */
    this.maxConcurrent = 2;

    /** @type {boolean} */
    this.disabled = false;
  }

  /**
   * Generate unique snackbar ID
   *
   * @pseudocode
   * 1. Increment counter
   * 2. Return prefixed ID string
   *
   * @returns {string} Unique ID
   */
  generateId() {
    return `snackbar_${++this.nextId}_${Date.now()}`;
  }

  /**
   * Get safe document reference
   *
   * @pseudocode
   * 1. Check if globalThis and document exist
   * 2. Return document or null
   *
   * @returns {Document|null}
   */
  getDocument() {
    if (typeof globalThis === "undefined") return null;
    return globalThis.document ?? null;
  }

  /**
   * Ensure snackbar container exists in DOM
   *
   * @pseudocode
   * 1. Check if container exists
   * 2. Create if missing
   * 3. Append to body
   *
   * @param {Document} doc - Document object
   * @returns {HTMLElement|null} Container element
   */
  ensureContainer(doc) {
    let container = doc.getElementById("snackbar-container");
    if (!container) {
      container = doc.createElement("div");
      container.id = "snackbar-container";
      doc.body?.appendChild(container);
    }
    return container;
  }

  /**
   * Check if snackbars are globally disabled
   *
   * @pseudocode
   * 1. Check window.__disableSnackbars flag
   * 2. Check manager disabled flag
   * 3. Return combined status
   *
   * @returns {boolean} True if disabled
   */
  isDisabled() {
    if (this.disabled) return true;
    try {
      return typeof window !== "undefined" && window.__disableSnackbars;
    } catch {
      return false;
    }
  }

  /**
   * Compare priority levels
   *
   * @pseudocode
   * 1. Map priority to numeric value
   * 2. Compare values
   * 3. Return comparison result
   *
   * @param {SnackbarPriority} priority1 - First priority
   * @param {SnackbarPriority} priority2 - Second priority
   * @returns {number} -1 if p1 < p2, 0 if equal, 1 if p1 > p2
   */
  comparePriority(priority1, priority2) {
    const values = {
      [SnackbarPriority.HIGH]: 3,
      [SnackbarPriority.NORMAL]: 2,
      [SnackbarPriority.LOW]: 1
    };

    const val1 = values[priority1] || values[SnackbarPriority.NORMAL];
    const val2 = values[priority2] || values[SnackbarPriority.NORMAL];

    if (val1 < val2) return -1;
    if (val1 > val2) return 1;
    return 0;
  }

  /**
   * Check if message can be displayed based on priority and capacity
   *
   * @pseudocode
   * 1. If no active messages, allow
   * 2. Find highest priority among active messages
   * 3. Queue if lower than highest (respects strict priority hierarchy)
   * 4. If same or higher priority: allow up to capacity, then evict oldest/lowest
   *
   * @param {SnackbarPriority} priority - Message priority
   * @returns {boolean} True if can display
   */
  canDisplay(priority) {
    // No active messages - always allow
    if (this.activeSnackbars.size === 0) {
      return true;
    }

    // Find highest priority among active snackbars
    const active = Array.from(this.activeSnackbars.values());
    let highestPriority = null;
    for (const snackbar of active) {
      if (!highestPriority || this.comparePriority(snackbar.priority, highestPriority) > 0) {
        highestPriority = snackbar.priority;
      }
    }

    // Queue if lower than highest active priority (even if under capacity)
    // This ensures lower priority messages don't interfere with higher priority ones
    if (highestPriority && this.comparePriority(priority, highestPriority) < 0) {
      return false;
    }

    // Same or higher priority - allow up to capacity
    if (this.activeSnackbars.size < this.maxConcurrent) {
      return true;
    }

    // At capacity with same/higher priority - allow (will evict oldest/lowest)
    return true;
  }

  /**
   * Create snackbar DOM element
   *
   * @pseudocode
   * 1. Create div element
   * 2. Set classes and attributes
   * 3. Set text content
   * 4. Set accessibility attributes
   * 5. Return element
   *
   * @param {string} id - Snackbar ID
   * @param {string} message - Message text
   * @param {SnackbarPriority} priority - Priority level
   * @returns {HTMLElement} Snackbar element
   */
  createElement(id, message, priority) {
    const doc = this.getDocument();
    if (!doc) return null;

    const element = doc.createElement("div");
    element.className = "snackbar";
    element.textContent = message;
    element.dataset.snackbarId = id;
    element.dataset.snackbarPriority = priority;

    // Accessibility
    element.setAttribute("role", "status");
    element.setAttribute("aria-atomic", "false");
    element.setAttribute("aria-live", priority === SnackbarPriority.HIGH ? "assertive" : "polite");

    return element;
  }

  /**
   * Apply positioning classes based on active snackbars
   *
   * @pseudocode
   * 1. Get array of active snackbars
   * 2. Sort by priority (high first), then by sequence (newest first)
   * 3. Apply .snackbar-bottom to most important
   * 4. Apply .snackbar-top to others
   * 5. Apply .snackbar-stale for reduced opacity
   *
   * @returns {void}
   */
  updatePositioning() {
    const active = Array.from(this.activeSnackbars.values());
    if (active.length === 0) return;

    console.log(
      "[SnackbarManager] updatePositioning - BEFORE sort:",
      active.map((s) => ({ msg: s.message.substring(0, 20), pri: s.priority, seq: s.sequence }))
    );

    // Sort by priority (high first), then by sequence (newest first)
    active.sort((a, b) => {
      const priorityCompare = this.comparePriority(b.priority, a.priority);
      if (priorityCompare !== 0) return priorityCompare;
      // Use sequence number for deterministic ordering
      return b.sequence - a.sequence;
    });

    // DEBUG: Log sorted order
    console.log(
      "[SnackbarManager] updatePositioning - AFTER sort:",
      active.map((s) => ({ msg: s.message.substring(0, 20), pri: s.priority, seq: s.sequence }))
    );

    active.forEach((snackbar, index) => {
      if (!snackbar.element) return;

      if (index === 0) {
        // Most important/newest message at bottom
        console.log(
          `[SnackbarManager] Setting .snackbar-bottom on: "${snackbar.message.substring(0, 30)}"`
        );
        snackbar.element.classList.add("snackbar-bottom");
        snackbar.element.classList.remove("snackbar-top", "snackbar-stale");
      } else {
        // Older/lower priority messages at top with reduced opacity
        console.log(
          `[SnackbarManager] Setting .snackbar-top on: "${snackbar.message.substring(0, 30)}"`
        );
        snackbar.element.classList.add("snackbar-top", "snackbar-stale");
        snackbar.element.classList.remove("snackbar-bottom");
      }
    });
  }

  /**
   * Show a snackbar message
   *
   * @pseudocode
   * 1. Validate not disabled
   * 2. Check priority vs current
   * 3. If lower priority, queue for later
   * 4. If can display:
   *    a. Enforce max concurrent limit
   *    b. Create element and add to DOM
   *    c. Track in active map
   *    d. Update positioning
   *    e. Set auto-dismiss if configured
   *    f. Call onShow callback
   * 5. Return controller object
   *
   * @param {string|SnackbarConfig} messageOrConfig - Message text or configuration object
   * @returns {{id: string, remove: Function, update: Function, waitForMinDuration: Function}|null}
   */
  show(messageOrConfig) {
    console.log(
      "[SnackbarManager] show() called with:",
      typeof messageOrConfig === "string" ? messageOrConfig.substring(0, 30) : messageOrConfig
    );

    if (this.isDisabled()) {
      console.log("[SnackbarManager] show() returning null - snackbars are disabled");
      return null;
    }

    const doc = this.getDocument();
    if (!doc) {
      console.log("[SnackbarManager] show() returning null - no document");
      return null;
    }

    // Normalize config
    const config =
      typeof messageOrConfig === "string" ? { message: messageOrConfig } : messageOrConfig;

    const {
      message,
      priority = SnackbarPriority.NORMAL,
      minDuration = 0,
      autoDismiss = 3000,
      onShow,
      onDismiss
    } = config;

    // Check if we can display based on priority
    const canDisplayResult = this.canDisplay(priority);
    console.log(`[SnackbarManager] canDisplay(${priority}):`, {
      result: canDisplayResult,
      activeCount: this.activeSnackbars.size,
      queueLength: this.queue.length,
      activePriorities: Array.from(this.activeSnackbars.values()).map((s) => ({
        msg: s.message.substring(0, 20),
        pri: s.priority
      }))
    });

    if (!canDisplayResult) {
      // Queue for later
      const id = this.generateId();
      this.queue.push({ id, config });
      console.log(`[SnackbarManager] QUEUED: "${message.substring(0, 30)}..."`);
      return {
        id,
        remove: () => this.remove(id),
        update: (newMessage) => this.update(id, newMessage),
        waitForMinDuration: async () => {}
      };
    }

    // Ensure container exists
    const container = this.ensureContainer(doc);
    if (!container) {
      console.log("[SnackbarManager] show() returning null - no container");
      return null;
    }

    // Enforce max concurrent limit (remove synchronously to avoid race conditions)
    if (this.activeSnackbars.size >= this.maxConcurrent) {
      // Remove oldest, lowest priority snackbar
      const active = Array.from(this.activeSnackbars.values());
      active.sort((a, b) => {
        const priorityCompare = this.comparePriority(a.priority, b.priority);
        if (priorityCompare !== 0) return priorityCompare;
        // Use sequence for deterministic ordering (oldest first)
        return a.sequence - b.sequence;
      });
      if (active[0]) {
        // Synchronous removal (skip minDuration for capacity management)
        const toRemove = active[0];
        if (toRemove.autoDismissId) {
          clearTimeout(toRemove.autoDismissId);
        }
        if (toRemove.element && toRemove.element.parentNode) {
          toRemove.element.remove();
        }
        this.activeSnackbars.delete(toRemove.id);
      }
    }

    // Create snackbar
    const id = this.generateId();
    const element = this.createElement(id, message, priority);
    if (!element) {
      console.log("[SnackbarManager] show() returning null - createElement failed");
      return null;
    }

    // Add to DOM
    container.appendChild(element);

    // Force reflow for animation
    element.offsetWidth;
    element.classList.add("snackbar--active");

    // Create snackbar entry with monotonic sequence
    const snackbar = {
      id,
      message,
      priority,
      minDuration,
      shownAt: Date.now(),
      sequence: ++this.sequenceCounter,
      element,
      onShow,
      onDismiss
    };

    // DEBUG: Log when snackbar is created
    console.log(`[SnackbarManager] Created snackbar: "${message}" seq=${snackbar.sequence}`);

    // Set auto-dismiss if configured
    if (autoDismiss > 0) {
      snackbar.autoDismissId = setTimeout(() => {
        this.remove(id);
      }, autoDismiss);
    }

    // Track in active map
    this.activeSnackbars.set(id, snackbar);

    // Update current priority
    if (!this.currentPriority || this.comparePriority(priority, this.currentPriority) > 0) {
      this.currentPriority = priority;
    }

    // Update positioning
    this.updatePositioning();

    // Call onShow callback
    if (onShow) {
      try {
        onShow();
      } catch (error) {
        console.error("[SnackbarManager] onShow callback error:", error);
      }
    }

    // Return controller
    return {
      id,
      remove: () => this.remove(id),
      update: (newMessage) => this.update(id, newMessage),
      waitForMinDuration: async () => this.waitForMinDuration(id)
    };
  }

  /**
   * Wait for minimum display duration to elapse
   *
   * @pseudocode
   * 1. Get snackbar from active map
   * 2. Calculate elapsed time
   * 3. If less than minDuration, wait for remainder
   * 4. Resolve promise when duration met
   *
   * @param {string} id - Snackbar ID
   * @returns {Promise<void>}
   */
  async waitForMinDuration(id) {
    const snackbar = this.activeSnackbars.get(id);
    if (!snackbar) return;

    const elapsed = Date.now() - snackbar.shownAt;
    const remaining = snackbar.minDuration - elapsed;

    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }
  }

  /**
   * Remove a snackbar by ID
   *
   * @pseudocode
   * 1. Get snackbar from active map
   * 2. Enforce minimum display duration
   * 3. Clear auto-dismiss timeout
   * 4. Remove element from DOM
   * 5. Remove from active map
   * 6. Update current priority
   * 7. Call onDismiss callback
   * 8. Process queue for next message
   *
   * @param {string} id - Snackbar ID
   * @returns {Promise<void>}
   */
  async remove(id) {
    const snackbar = this.activeSnackbars.get(id);
    if (!snackbar) {
      // Check if in queue
      const queueIndex = this.queue.findIndex((item) => item.id === id);
      if (queueIndex !== -1) {
        this.queue.splice(queueIndex, 1);
      }
      return;
    }

    // Enforce minimum display duration
    await this.waitForMinDuration(id);

    // Clear auto-dismiss timeout
    if (snackbar.autoDismissId) {
      clearTimeout(snackbar.autoDismissId);
    }

    // Remove element from DOM
    if (snackbar.element && snackbar.element.parentNode) {
      snackbar.element.remove();
    }

    // Remove from active map
    this.activeSnackbars.delete(id);

    // Update current priority
    if (this.activeSnackbars.size === 0) {
      this.currentPriority = null;
    } else {
      // Recalculate highest priority
      const priorities = Array.from(this.activeSnackbars.values()).map((s) => s.priority);
      this.currentPriority = priorities.reduce((highest, current) => {
        return this.comparePriority(current, highest) > 0 ? current : highest;
      }, SnackbarPriority.LOW);
    }

    // Update positioning
    this.updatePositioning();

    // Call onDismiss callback
    if (snackbar.onDismiss) {
      try {
        snackbar.onDismiss();
      } catch (error) {
        console.error("[SnackbarManager] onDismiss callback error:", error);
      }
    }

    // Process queue
    this.processQueue();
  }

  /**
   * Update a snackbar message
   *
   * @pseudocode
   * 1. Get snackbar from active map
   * 2. If not found, check queue
   * 3. Update message text
   * 4. Restart animation
   * 5. Reset shown timestamp
   *
   * @param {string} id - Snackbar ID
   * @param {string} newMessage - New message text
   * @returns {void}
   */
  update(id, newMessage) {
    const snackbar = this.activeSnackbars.get(id);
    if (!snackbar) {
      // Check queue
      const queueItem = this.queue.find((item) => item.id === id);
      if (queueItem) {
        queueItem.config.message = newMessage;
      }
      return;
    }

    if (!snackbar.element) return;

    // Update message
    snackbar.message = newMessage;
    snackbar.element.textContent = newMessage;

    // Restart animation
    snackbar.element.classList.remove("snackbar--active");
    snackbar.element.offsetWidth; // Force reflow
    snackbar.element.classList.add("snackbar--active");

    // Reset shown timestamp
    snackbar.shownAt = Date.now();
  }

  /**
   * Process queued messages
   *
   * @pseudocode
   * 1. Check if queue has messages
   * 2. Check if can display more
   * 3. Find highest priority message in queue
   * 4. Remove from queue and display
   * 5. Repeat until queue empty or at capacity
   *
   * @returns {void}
   */
  processQueue() {
    while (this.queue.length > 0 && this.activeSnackbars.size < this.maxConcurrent) {
      // Sort queue by priority
      this.queue.sort((a, b) => {
        return this.comparePriority(
          b.config.priority || SnackbarPriority.NORMAL,
          a.config.priority || SnackbarPriority.NORMAL
        );
      });

      // Get highest priority message
      const item = this.queue.shift();
      if (!item) break;

      // Check if can display
      const priority = item.config.priority || SnackbarPriority.NORMAL;
      if (this.canDisplay(priority)) {
        this.show(item.config);
      } else {
        // Put back in queue
        this.queue.unshift(item);
        break;
      }
    }
  }

  /**
   * Remove all active snackbars
   *
   * @pseudocode
   * 1. Iterate through active snackbars
   * 2. Remove each one (respecting min duration)
   * 3. Clear queue
   *
   * @returns {Promise<void>}
   */
  async removeAll() {
    const ids = Array.from(this.activeSnackbars.keys());
    await Promise.all(ids.map((id) => this.remove(id)));
    this.queue = [];
  }

  /**
   * Clear all snackbars immediately (ignore min duration)
   *
   * @pseudocode
   * 1. Clear all timeouts
   * 2. Remove all elements from DOM
   * 3. Clear active map
   * 4. Clear queue
   * 5. Reset priority
   *
   * @returns {void}
   */
  clearAll() {
    // Clear all timeouts and remove elements
    this.activeSnackbars.forEach((snackbar) => {
      if (snackbar.autoDismissId) {
        clearTimeout(snackbar.autoDismissId);
      }
      if (snackbar.element && snackbar.element.parentNode) {
        snackbar.element.remove();
      }
      if (snackbar.onDismiss) {
        try {
          snackbar.onDismiss();
        } catch (error) {
          console.error("[SnackbarManager] onDismiss callback error:", error);
        }
      }
    });

    // Clear state
    this.activeSnackbars.clear();
    this.queue = [];
    this.currentPriority = null;
  }

  /**
   * Get diagnostic information
   *
   * @pseudocode
   * 1. Collect active snackbar info
   * 2. Collect queue info
   * 3. Return diagnostic object
   *
   * @returns {Object} Diagnostic information
   */
  getDiagnostics() {
    return {
      activeCount: this.activeSnackbars.size,
      queueLength: this.queue.length,
      currentPriority: this.currentPriority,
      active: Array.from(this.activeSnackbars.values()).map((s) => ({
        id: s.id,
        message: s.message,
        priority: s.priority,
        shownAt: s.shownAt,
        elapsedMs: Date.now() - s.shownAt,
        minDuration: s.minDuration
      })),
      queued: this.queue.map((item) => ({
        id: item.id,
        message: item.config.message,
        priority: item.config.priority || SnackbarPriority.NORMAL
      }))
    };
  }
}

// Create singleton instance
const snackbarManager = new SnackbarManager();

// Expose globally for backward compatibility and testing
if (typeof window !== "undefined") {
  window.__snackbarManager = snackbarManager;
}

export default snackbarManager;
