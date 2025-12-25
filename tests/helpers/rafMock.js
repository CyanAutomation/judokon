import { vi } from "vitest";

/**
 * Queue-based mock for requestAnimationFrame/cancelAnimationFrame.
 * Provides deterministic control over animation frame scheduling in tests.
 *
 * Expected behavior (contract):
 * - Callbacks are queued in FIFO order.
 * - flushNext executes only the next queued callback.
 * - flushAll drains the queue in order.
 *
 * Debug mode can be enabled with RAF_MOCK_DEBUG=1 or DEBUG_RAF=1 environment variables.
 * When enabled, logs queue operations, callback counts, and pending callbacks.
 *
 * @pseudocode
 * - install(): Replace global RAF/CAF with mocked versions
 * - uninstall(): Restore original RAF/CAF globals
 * - enqueue(callback): Manually enqueue a callback (for testing)
 * - flushNext(): Execute the next queued callback
 * - flushAll(): Execute all queued callbacks
 * - cancel(id): Cancel a specific queued callback
 * - withRafMock(fn): Auto-install/uninstall wrapper
 */
class RafMock {
  constructor() {
    this.rafQueue = [];
    this.rafIdCounter = 0;
    this.originalRAF = null;
    this.originalCAF = null;
    this.installed = false;
  }

  /**
   * Check if debug mode is enabled via environment variable
   */
  isDebugEnabled() {
    return process.env.RAF_MOCK_DEBUG === "1" || process.env.DEBUG_RAF === "1";
  }

  /**
   * Debug logging helper
   */
  debug(message, ...args) {
    if (this.isDebugEnabled()) {
      console.log(`[RAF Mock] ${message}`, ...args);
    }
  }

  /**
   * Install the mock by replacing global requestAnimationFrame/cancelAnimationFrame
   */
  install() {
    if (this.installed) return;

    this.originalRAF = globalThis.requestAnimationFrame;
    this.originalCAF = globalThis.cancelAnimationFrame;
    this.rafQueue = [];
    this.rafIdCounter = 0;

    globalThis.requestAnimationFrame = vi.fn((cb) => {
      const id = ++this.rafIdCounter;
      this.rafQueue.push({ id, cb });
      this.debug(`Enqueued callback ${id}, queue length: ${this.rafQueue.length}`);
      return id;
    });

    globalThis.cancelAnimationFrame = vi.fn((id) => {
      const index = this.rafQueue.findIndex((item) => item.id === id);
      if (index > -1) {
        this.rafQueue.splice(index, 1);
        this.debug(`Cancelled callback ${id}, queue length: ${this.rafQueue.length}`);
        return true;
      }
      this.debug(`Cancel failed: callback ${id} not found`);
      return false;
    });

    this.installed = true;
    this.debug("RAF mock installed");
  }

  /**
   * Uninstall the mock and restore original globals
   */
  uninstall() {
    if (!this.installed) return;

    try {
      globalThis.requestAnimationFrame = this.originalRAF;
    } catch {}
    try {
      globalThis.cancelAnimationFrame = this.originalCAF;
    } catch {}
    try {
      delete globalThis.flushRAF;
    } catch {}

    const pendingCount = this.rafQueue.length;
    this.rafQueue = [];
    this.rafIdCounter = 0;
    this.installed = false;
    this.debug(`RAF mock uninstalled, cleared ${pendingCount} pending callbacks`);
  }

  /**
   * Manually enqueue a callback (for testing purposes)
   */
  enqueue(callback) {
    const id = ++this.rafIdCounter;
    this.rafQueue.push({ id, cb: callback });
    this.debug(`Manually enqueued callback ${id}, queue length: ${this.rafQueue.length}`);
    return id;
  }

  /**
   * Execute the next queued callback
   */
  flushNext() {
    if (this.rafQueue.length === 0) {
      this.debug("flushNext: no callbacks in queue");
      return;
    }
    const { id, cb } = this.rafQueue.shift();
    this.debug(`Flushing callback ${id}, ${this.rafQueue.length} remaining`);
    try {
      cb(performance.now());
    } catch {}
  }

  /**
   * Execute all queued callbacks in FIFO order
   */
  flushAll() {
    const count = this.rafQueue.length;
    if (count === 0) {
      this.debug("flushAll: no callbacks in queue");
      return;
    }
    this.debug(`Flushing all ${count} callbacks`);
    while (this.rafQueue.length > 0) {
      const { id, cb } = this.rafQueue.shift();
      this.debug(`Flushing callback ${id}, ${this.rafQueue.length} remaining`);
      try {
        cb(performance.now());
      } catch {
        // swallow to keep test harness stable; tests should surface errors
        // via their own assertions.
      }
    }
  }

  /**
   * Cancel a specific queued callback by ID
   */
  cancel(id) {
    const index = this.rafQueue.findIndex((item) => item.id === id);
    if (index > -1) {
      this.rafQueue.splice(index, 1);
      this.debug(`Manually cancelled callback ${id}, queue length: ${this.rafQueue.length}`);
      return true;
    }
    this.debug(`Manual cancel failed: callback ${id} not found`);
    return false;
  }

  /**
   * Get the current queue length (for testing/debugging)
   */
  get queueLength() {
    return this.rafQueue.length;
  }

  /**
   * Get queued callback IDs (for testing/debugging)
   */
  get queuedIds() {
    return this.rafQueue.map((item) => item.id);
  }
}

// Singleton instance for convenience
const rafMock = new RafMock();

/**
 * Install the RAF mock
 */
export function install() {
  rafMock.install();
}

/**
 * Uninstall the RAF mock
 */
export function uninstall() {
  rafMock.uninstall();
}

/**
 * Manually enqueue a callback
 */
export function enqueue(callback) {
  return rafMock.enqueue(callback);
}

/**
 * Flush the next queued callback
 */
export function flushNext() {
  rafMock.flushNext();
}

/**
 * Flush all queued callbacks
 */
export function flushAll() {
  rafMock.flushAll();
}

/**
 * Cancel a specific queued callback
 */
export function cancel(id) {
  return rafMock.cancel(id);
}

/**
 * Auto-install/uninstall wrapper for test functions
 */
export function withRafMock(fn) {
  install();
  try {
    return fn();
  } finally {
    uninstall();
  }
}

// Legacy compatibility - keep installRAFMock for existing tests
export function installRAFMock() {
  rafMock.install();

  // Legacy return object for backward compatibility
  return {
    restore: () => rafMock.uninstall(),
    flushAll: () => rafMock.flushAll(),
    flushNext: () => rafMock.flushNext(),
    cancel: (id) => rafMock.cancel(id)
  };
}

export default installRAFMock;
