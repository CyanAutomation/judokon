/**
 * Snackbar Lifecycle Manager
 *
 * Manages the complete lifecycle of snackbar messages with:
 * - Message metadata (priority/type) for rendering
 * - Guaranteed minimum display duration
 * - Coordinated lifecycle callbacks
 *
 * @pseudocode
 * 1. Accept message payloads with display metadata
 * 2. Render messages without suppressing caller choices
 * 3. Enforce minimum display duration before removal
 * 4. Provide programmatic control over message lifecycle
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
 * @property {string} text - Text content to display
 * @property {string} [message] - Legacy alias for text
 * @property {string} [type] - Optional message type for styling (e.g., info, warning, error)
 * @property {SnackbarPriority} [priority='normal'] - Message priority level
 * @property {number} [ttl=3000] - Auto-dismiss timeout (0 = manual dismiss only)
 * @property {number} [autoDismiss] - Legacy alias for ttl
 * @property {number} [minDuration=0] - Minimum display duration in milliseconds
 * @property {Function} [onShow] - Callback when message appears
 * @property {Function} [onDismiss] - Callback when message is dismissed
 */

/**
 * Active snackbar entry
 * @typedef {Object} ActiveSnackbar
 * @property {string} id - Unique identifier
 * @property {string} text - Message text
 * @property {string|undefined} type - Optional message type
 * @property {SnackbarPriority} priority - Priority level
 * @property {number} minDuration - Minimum display duration
 * @property {number} shownAt - Timestamp when displayed
 * @property {number} sequence - Monotonic sequence number for deterministic ordering
 * @property {HTMLElement} element - DOM element
 * @property {"Visible"|"Dismissing"} state - Lifecycle state
 * @property {number} [autoDismissId] - Timeout ID for auto-dismiss
 * @property {(event: AnimationEvent) => void} [animationEndHandler] - Animation end handler
 * @property {Function} [onShow] - Show callback
 * @property {Function} [onDismiss] - Dismiss callback
 */

class SnackbarManager {
  constructor() {
    /** @type {number} */
    this.maxVisible = 2;

    /** @type {Map<string, ActiveSnackbar>} */
    this.activeSnackbars = new Map();

    /** @type {number} */
    this.nextId = 0;

    /** @type {number} - Monotonic counter for deterministic ordering */
    this.sequenceCounter = 0;

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

    container.setAttribute("role", "status");
    container.setAttribute("aria-live", "polite");
    container.setAttribute("aria-atomic", "false");

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
   * Create snackbar DOM element
   *
   * @pseudocode
   * 1. Create div element
   * 2. Set classes and attributes
   * 3. Set text content
   * 4. Keep element semantics neutral (container owns live region)
   * 5. Return element
   *
   * @param {string} id - Snackbar ID
   * @param {string} text - Message text
   * @param {SnackbarPriority} priority - Priority level
   * @param {string|undefined} type - Message type
   * @returns {HTMLElement} Snackbar element
   */
  createElement(id, text, priority, type) {
    const doc = this.getDocument();
    if (!doc) return null;

    const element = doc.createElement("div");
    element.className = "snackbar";
    element.textContent = text;
    element.dataset.snackbarId = id;
    element.dataset.snackbarPriority = priority;
    if (type) {
      element.dataset.snackbarType = type;
    }

    return element;
  }

  /**
   * Apply positioning classes based on active snackbars
   *
   * @pseudocode
   * 1. Get array of active snackbars
   * 2. Sort by sequence (newest first)
   * 3. Apply .snackbar-bottom to newest
   * 4. Apply .snackbar-top to others
   * 5. Apply .snackbar-stale for reduced opacity
   *
   * @returns {void}
   */
  updatePositioning() {
    const active = this.getVisibleSnackbarsBySequence({ newestFirst: true });
    if (active.length === 0) return;

    active.forEach((snackbar, index) => {
      if (!snackbar.element) return;

      if (index === 0) {
        // Newest message at bottom
        snackbar.element.classList.add("snackbar-bottom");
        snackbar.element.classList.remove("snackbar-top", "snackbar-stale");
      } else {
        // Older messages at top with reduced opacity
        snackbar.element.classList.add("snackbar-top", "snackbar-stale");
        snackbar.element.classList.remove("snackbar-bottom");
      }
    });

    this.syncContainerPriority();
  }

  /**
   * Sync container live-region urgency from active snackbar priorities.
   *
   * @pseudocode
   * 1. Resolve snackbar container from document.
   * 2. Determine whether any visible snackbar is HIGH priority.
   * 3. Set container aria-live to assertive for HIGH, otherwise polite.
   *
   * @returns {void}
   */
  syncContainerPriority() {
    const doc = this.getDocument();
    if (!doc) return;

    const container = doc.getElementById("snackbar-container");
    if (!container) return;

    const visible = this.getVisibleSnackbarsBySequence();
    const hasHighPriority = visible.some((snackbar) => snackbar.priority === SnackbarPriority.HIGH);
    container.setAttribute("aria-live", hasHighPriority ? "assertive" : "polite");
  }

  /**
   * Project visible snackbar entries in deterministic sequence order.
   *
   * @pseudocode
   * 1. Filter out entries already in Dismissing state.
   * 2. Sort by sequence counter for deterministic ordering.
   * 3. Return sorted projection for all callers (eviction + positioning).
   *
   * @param {{newestFirst?: boolean}} [options] - Sort direction options.
   * @returns {ActiveSnackbar[]} Ordered visible snackbar entries.
   */
  getVisibleSnackbarsBySequence({ newestFirst = false } = {}) {
    const direction = newestFirst ? -1 : 1;
    return Array.from(this.activeSnackbars.values())
      .filter((snackbar) => snackbar.state !== "Dismissing")
      .sort((a, b) => direction * (a.sequence - b.sequence));
  }

  /**
   * Show a snackbar message
   *
   * @pseudocode
   * 1. Validate not disabled
   * 2. Normalize message contract
   * 3. Create element and add to DOM
   * 4. Track in active map
   * 5. Update positioning
   * 6. Set auto-dismiss if configured
   * 7. Call onShow callback
   * 8. Return controller object
   *
   * @param {string|SnackbarConfig} messageOrConfig - Message text or configuration object
   * @returns {{id: string, remove: Function, update: Function, waitForMinDuration: Function}|null}
   */
  show(messageOrConfig) {
    if (this.isDisabled()) {
      return null;
    }

    const doc = this.getDocument();
    if (!doc) {
      return null;
    }

    // Normalize config
    const config =
      typeof messageOrConfig === "string" ? { text: messageOrConfig } : messageOrConfig || {};

    const {
      text: messageText,
      type,
      priority = SnackbarPriority.NORMAL,
      minDuration = 0,
      ttl,
      autoDismiss,
      onShow,
      onDismiss
    } = config;

    // Ensure container exists
    const container = this.ensureContainer(doc);
    if (!container) {
      return null;
    }

    // Enforce cap before creating a new snackbar (defensive against stale overflow).
    this.evictOverflow();

    // Create snackbar
    const id = this.generateId();
    const normalizedText = messageText ?? config.message ?? "";
    const element = this.createElement(id, normalizedText, priority, type);
    if (!element) {
      return null;
    }
    const handleAnimationEnd = (event) => {
      if (event.animationName !== "snackbar-cycle") {
        return;
      }
      // Only auto-remove if minimum duration has been met
      const snackbar = this.activeSnackbars.get(id);
      if (snackbar) {
        const elapsed = Date.now() - snackbar.shownAt;
        if (elapsed >= snackbar.minDuration) {
          this.remove(id);
        }
      }
    };
    element.addEventListener("animationend", handleAnimationEnd);

    // Add to DOM
    container.appendChild(element);

    // Force reflow for animation
    element.offsetWidth;
    element.classList.add("snackbar--active");

    // Create snackbar entry with monotonic sequence
    const snackbar = {
      id,
      text: normalizedText,
      type,
      priority,
      minDuration,
      shownAt: Date.now(),
      sequence: ++this.sequenceCounter,
      state: "Visible",
      element,
      animationEndHandler: handleAnimationEnd,
      onShow,
      onDismiss
    };

    // Set auto-dismiss if configured
    const dismissAfter = Number.isFinite(ttl)
      ? ttl
      : Number.isFinite(autoDismiss)
        ? autoDismiss
        : 3000;
    if (dismissAfter > 0) {
      snackbar.autoDismissId = setTimeout(() => {
        this.remove(id);
      }, dismissAfter);
    }

    // Track in active map
    this.activeSnackbars.set(id, snackbar);

    // Enforce visible cap after insertion (3rd message evicts oldest deterministically).
    this.evictOverflow();

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
   * Enforce the maximum number of visible snackbars.
   *
   * @pseudocode
   * 1. Collect visible snackbars sorted oldest-first.
   * 2. While count exceeds max, dismiss oldest immediately.
   *
   * @returns {void}
   */
  evictOverflow() {
    const visible = this.getVisibleSnackbarsBySequence();

    while (visible.length > this.maxVisible) {
      const evicted = visible.shift();
      if (!evicted) {
        return;
      }
      this.dismiss(evicted.id, { ignoreMinDuration: true });
    }
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
   * 6. Call onDismiss callback
   *
   * @param {string} id - Snackbar ID
   * @returns {Promise<void>}
   */
  async remove(id) {
    await this.dismiss(id, { ignoreMinDuration: false });
  }

  /**
   * Dismiss a snackbar by ID.
   *
   * @pseudocode
   * 1. Resolve snackbar from active map.
   * 2. Ignore duplicate dismissals while already dismissing.
   * 3. Optionally enforce minimum duration.
   * 4. Tear down timers/listeners and remove DOM node.
   * 5. Delete active entry and invoke lifecycle callback.
   *
   * @param {string} id - Snackbar ID
   * @param {{ignoreMinDuration?: boolean}} [options] - Dismiss options
   * @returns {Promise<void>}
   */
  async dismiss(id, { ignoreMinDuration = false } = {}) {
    const snackbar = this.activeSnackbars.get(id);
    if (!snackbar || snackbar.state === "Dismissing") {
      return;
    }

    snackbar.state = "Dismissing";

    // Enforce minimum display duration
    if (!ignoreMinDuration) {
      await this.waitForMinDuration(id);
    }

    // Clear auto-dismiss timeout
    // Clear auto-dismiss timeout and event listeners
    if (snackbar.autoDismissId) {
      clearTimeout(snackbar.autoDismissId);
    }
    if (snackbar.animationEndHandler && snackbar.element) {
      snackbar.element.removeEventListener("animationend", snackbar.animationEndHandler);
    }

    // Remove element from DOM
    if (snackbar.element && snackbar.element.parentNode) {
      snackbar.element.remove();
    }

    // Remove from active map
    this.activeSnackbars.delete(id);

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
  }

  /**
   * Update a snackbar message
   *
   * @pseudocode
   * 1. Get snackbar from active map
   * 2. Update message text
   * 3. Restart animation
   * 4. Reset shown timestamp
   *
   * @param {string} id - Snackbar ID
   * @param {string|Partial<SnackbarConfig>} newMessage - New message text or config
   * @returns {void}
   */
  update(id, newMessage) {
    const snackbar = this.activeSnackbars.get(id);
    if (!snackbar || snackbar.state === "Dismissing") {
      return;
    }

    if (!snackbar.element) return;

    const nextText =
      typeof newMessage === "string" ? newMessage : (newMessage?.text ?? newMessage?.message);
    const nextType = typeof newMessage === "string" ? snackbar.type : newMessage?.type;
    const nextPriority =
      typeof newMessage === "string"
        ? snackbar.priority
        : (newMessage?.priority ?? snackbar.priority);

    // Update message
    if (typeof nextText === "string") {
      snackbar.text = nextText;
      snackbar.element.textContent = nextText;
    }
    if (nextType !== undefined) {
      snackbar.type = nextType;
      if (nextType) {
        snackbar.element.dataset.snackbarType = nextType;
      } else {
        delete snackbar.element.dataset.snackbarType;
      }
    }
    if (nextPriority && nextPriority !== snackbar.priority) {
      snackbar.priority = nextPriority;
      snackbar.element.dataset.snackbarPriority = nextPriority;
      this.syncContainerPriority();
    }

    // Restart animation
    snackbar.element.classList.remove("snackbar--active");
    snackbar.element.offsetWidth; // Force reflow
    snackbar.element.classList.add("snackbar--active");

    // Reset shown timestamp
    snackbar.shownAt = Date.now();
  }

  /**
   * Remove all active snackbars
   *
   * @pseudocode
   * 1. Iterate through active snackbars
   * 2. Remove each one (respecting min duration)
   *
   * @returns {Promise<void>}
   */
  async removeAll() {
    const ids = Array.from(this.activeSnackbars.keys());
    await Promise.all(ids.map((id) => this.dismiss(id, { ignoreMinDuration: false })));
  }

  /**
   * Clear all snackbars immediately (ignore min duration)
   *
   * @pseudocode
   * 1. Clear all timeouts
   * 2. Remove all elements from DOM
   * 3. Clear active map
   *
   * @returns {void}
   */
  clearAll() {
    // Clear all timeouts and remove elements
    this.activeSnackbars.forEach((snackbar) => {
      if (snackbar.autoDismissId) {
        clearTimeout(snackbar.autoDismissId);
      }
      if (snackbar.animationEndHandler && snackbar.element) {
        snackbar.element.removeEventListener("animationend", snackbar.animationEndHandler);
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

    this.syncContainerPriority();
  }

  /**
   * Get ID of newest visible snackbar.
   *
   * @pseudocode
   * 1. Collect visible snackbars.
   * 2. Sort newest-first by sequence.
   * 3. Return first ID or null.
   *
   * @returns {string|null} Newest visible snackbar ID
   */
  getLatestVisibleId() {
    const latest = Array.from(this.activeSnackbars.values())
      .filter((snackbar) => snackbar.state !== "Dismissing")
      .sort((a, b) => b.sequence - a.sequence)[0];

    return latest?.id ?? null;
  }

  /**
   * Get diagnostic information
   *
   * @pseudocode
   * 1. Collect active snackbar info
   * 2. Return diagnostic object
   *
   * @returns {Object} Diagnostic information
   */
  getDiagnostics() {
    return {
      activeCount: this.activeSnackbars.size,
      active: Array.from(this.activeSnackbars.values()).map((s) => ({
        id: s.id,
        text: s.text,
        type: s.type,
        priority: s.priority,
        shownAt: s.shownAt,
        elapsedMs: Date.now() - s.shownAt,
        minDuration: s.minDuration
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
