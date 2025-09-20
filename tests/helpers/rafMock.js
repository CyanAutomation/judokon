import { vi } from "vitest";

/**
 * Install a queue-based mock for requestAnimationFrame/cancelAnimationFrame.
 * Returns { restore, flushAll, flushNext, cancel }.
 */
export function installRAFMock() {
  const rafQueue = [];
  let rafIdCounter = 0;

  const originalRAF = globalThis.requestAnimationFrame;
  const originalCAF = globalThis.cancelAnimationFrame;

  globalThis.requestAnimationFrame = vi.fn((cb) => {
    const id = ++rafIdCounter;
    rafQueue.push({ id, cb });
    return id;
  });

  globalThis.cancelAnimationFrame = vi.fn((id) => {
    const index = rafQueue.findIndex((item) => item.id === id);
    if (index > -1) {
      rafQueue.splice(index, 1);
      return true;
    }
    return false;
  });

  const flushAll = () => {
    // Run queued callbacks in FIFO order. Callbacks enqueued during a flush
    // are appended and will be run in subsequent flushAll calls.
    while (rafQueue.length > 0) {
      const { cb } = rafQueue.shift();
      try {
        cb(performance.now());
      } catch {
        // swallow to keep test harness stable; tests should surface errors
        // via their own assertions.
      }
    }
  };

  const flushNext = () => {
    if (rafQueue.length === 0) return;
    const { cb } = rafQueue.shift();
    try {
      cb(performance.now());
    } catch {}
  };

  const cancel = (id) => {
    const index = rafQueue.findIndex((item) => item.id === id);
    if (index > -1) {
      rafQueue.splice(index, 1);
      return true;
    }
    return false;
  };

  const restore = () => {
    try {
      globalThis.requestAnimationFrame = originalRAF;
    } catch {}
    try {
      globalThis.cancelAnimationFrame = originalCAF;
    } catch {}
    try {
      delete globalThis.flushRAF;
    } catch {}
  };

  // Expose a global flush helper for tests that expect it (existing tests call globalThis.flushRAF())
  globalThis.flushRAF = flushAll;

  return { restore, flushAll, flushNext, cancel };
}

export default installRAFMock;
