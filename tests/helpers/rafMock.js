import { vi } from "vitest";

/**
 * Queue-based mock for requestAnimationFrame/cancelAnimationFrame.
 * Provides deterministic control over animation frame scheduling in tests.
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
      return id;
    });

    globalThis.cancelAnimationFrame = vi.fn((id) => {
      const index = this.rafQueue.findIndex((item) => item.id === id);
      if (index > -1) {
        this.rafQueue.splice(index, 1);
        return true;
      }
      return false;
    });

    this.installed = true;
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

    this.rafQueue = [];
    this.rafIdCounter = 0;
    this.installed = false;
  }

  /**
   * Manually enqueue a callback (for testing purposes)
   */
  enqueue(callback) {
    const id = ++this.rafIdCounter;
    this.rafQueue.push({ id, cb: callback });
    return id;
  }

  /**
   * Execute the next queued callback
   */
  flushNext() {
    if (this.rafQueue.length === 0) return;
    const { cb } = this.rafQueue.shift();
    try {
      cb(performance.now());
    } catch {}
  }

  /**
   * Execute all queued callbacks in FIFO order
   */
  flushAll() {
    while (this.rafQueue.length > 0) {
      const { cb } = this.rafQueue.shift();
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
      return true;
    }
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
  const mock = new RafMock();
  mock.install();
  try {
    return fn(mock);
  } finally {
    mock.uninstall();
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
