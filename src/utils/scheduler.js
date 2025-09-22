/**
 * Shared animation scheduler built on `requestAnimationFrame`.
 *
 * @pseudocode
 * 1. Store callbacks for per-frame and per-second events in Maps.
 * 2. `start()` initializes a RAF loop that:
 *    a. Updates `currentTime` on each frame.
 *    b. Executes frame callbacks.
 *    c. When a new second is detected, executes second callbacks.
 * 3. `onFrame(cb)` and `onSecondTick(cb)` register callbacks and return ids.
 * 4. `cancel(id)` removes callbacks by id.
 * 5. `stop()` cancels the RAF loop and clears pending callbacks.
 */
let nextId = 0;
const frameCallbacks = new Map();
const secondCallbacks = new Map();
let running = false;
let paused = false;
let lastSecond;
let currentTime = 0;
let rafId = 0;

/**
 * Begin the animation loop.
 *
 * @pseudocode
 * 1. If already running, do nothing.
 * 2. Define `loop(time)`:
 *    a. Save `time` to `currentTime`.
 *    b. Call each frame callback with `time`.
 *    c. If the integer second changed, call second callbacks.
 *    d. Request the next frame via `requestAnimationFrame`.
 * 3. Kick off the loop with `requestAnimationFrame(loop)`.
 */
/**
 * Start the scheduler's requestAnimationFrame loop.
 *
 * @summary Begin invoking registered frame and second callbacks on a RAF loop.
 * @pseudocode
 * 1. If already running, return.
 * 2. Start RAF loop that updates `currentTime`, runs frame callbacks, and when
 *    a new second is observed, runs second callbacks.
 *
 * @returns {void}
 */
export function start() {
  if (running) return;
  running = true;
  const loop = (time) => {
    currentTime = time;
    if (!paused) {
      frameCallbacks.forEach((cb) => {
        try {
          cb(currentTime);
        } catch {
          // ignore callback errors to keep the scheduler running
        }
      });
      const sec = Math.floor(currentTime / 1000);
      if (sec !== lastSecond) {
        lastSecond = sec;
        secondCallbacks.forEach((cb) => {
          try {
            cb(time);
          } catch {
            // ignore callback errors to keep the scheduler running
          }
        });
      }
    }
    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);
}

/**
 * Register a callback to run every animation frame.
 *
 * @pseudocode
 * 1. Generate a unique id.
 * 2. Store `cb` in `frameCallbacks` under the id.
 * 3. Return the id for cancellation.
 *
 * @param {(time: number) => void} cb - Callback invoked each frame.
 * @returns {number} Identifier for the scheduled callback.
 */
export function onFrame(cb) {
  const id = ++nextId;
  frameCallbacks.set(id, cb);
  if (!running && typeof requestAnimationFrame === "function") {
    const isVitest = typeof process !== "undefined" && process.env && process.env.VITEST === "true";
    if (!isVitest) start();
  }
  return id;
}

/**
 * Register a callback that fires once per second.
 *
 * @pseudocode
 * 1. Generate a unique id.
 * 2. Store `cb` in `secondCallbacks` under the id.
 * 3. Return the id for cancellation.
 *
 * @param {(time: number) => void} cb - Callback invoked on each second.
 * @returns {number} Identifier for the scheduled callback.
 */
export function onSecondTick(cb) {
  const id = ++nextId;
  secondCallbacks.set(id, cb);
  if (!running && typeof requestAnimationFrame === "function") {
    const isVitest = typeof process !== "undefined" && process.env && process.env.VITEST === "true";
    if (!isVitest) start();
  }
  return id;
}

/**
 * Cancel a previously scheduled callback.
 *
 * @pseudocode
 * 1. Remove `id` from `frameCallbacks`.
 * 2. Remove `id` from `secondCallbacks`.
 *
 * @param {number} id - Identifier returned by `onFrame` or `onSecondTick`.
 */

/**
 * Remove a scheduled callback by id.
 *
 * @summary Cancel a previously registered `onFrame` or `onSecondTick` callback.
 * @param {number} id - Identifier returned from `onFrame` or `onSecondTick`.
 * @returns {void}
 * @pseudocode
 * 1. Delete the id from both `frameCallbacks` and `secondCallbacks` maps.
 */
export function cancel(id) {
  frameCallbacks.delete(id);
  secondCallbacks.delete(id);
}

/**
 * Halt the animation loop and clear all callbacks.
 *
 * @pseudocode
 * 1. If not running, do nothing.
 * 2. Set `running` to false and cancel the scheduled frame via `cancelAnimationFrame`.
 * 3. Clear both callback maps and reset timing state.
 */
/**
 * Stop the animation loop and clear all registered callbacks.
 *
 * @summary Cancel the RAF loop, clear callback maps, and reset scheduler state.
 * @pseudocode
 * 1. If not running, return.
 * 2. Cancel the scheduled RAF frame.
 * 3. Clear callback maps and reset timing variables.
 * @returns {void}
 */
export function stop() {
  if (!running) {
    // In test environments, we may not be running but still have callbacks to clear
    const isTestEnvironment = typeof globalThis !== "undefined" && globalThis.__TEST__;
    if (!isTestEnvironment) return;
  }
  running = false;
  paused = false;
  cancelAnimationFrame(rafId);
  rafId = 0;
  frameCallbacks.clear();
  secondCallbacks.clear();
  lastSecond = undefined;
  currentTime = 0;
}

/**
 * Pause the scheduler without clearing callbacks.
 *
 * @returns {void}
 * @pseudocode
 * 1. Set the paused flag to true.
 * 2. This prevents any scheduled tasks from executing.
 */
export function pause() {
  paused = true;
}

/**
 * Resume the scheduler.
 *
 * @returns {void}
 * @pseudocode
 * 1. Set the paused flag to false.
 * 2. This allows scheduled tasks to execute again.
 */
export function resume() {
  paused = false;
}

/**
 * Create a test controller for deterministic scheduler testing.
 *
 * This function is only functional in test environments and allows tests to
 * control the scheduler's timing deterministically without global monkey-patching.
 *
 * @throws {Error} If called outside of test environment
 * @returns {object} Test controller with methods to control timing
 * @property {() => void} advanceFrame - Advance the scheduler by one frame
 * @property {(ms: number) => void} advanceTime - Advance time by specified milliseconds
 * @property {() => number} getFrameCount - Get the number of frames executed
 * @property {() => void} dispose - Clean up the test controller
 */
export function createTestController() {
  const isTestEnvironment = typeof globalThis !== "undefined" && globalThis.__TEST__;

  if (!isTestEnvironment) {
    throw new Error(
      "createTestController() is only available in test environments. " +
        "Set globalThis.__TEST__ = true to enable."
    );
  }

  let testTime = 0;
  let frameCount = 0;
  let disposed = false;
  let testLastSecond = Math.floor(testTime / 1000); // Initialize to current second

  // Store original timing functions
  const originalRaf = globalThis.requestAnimationFrame;
  const originalCaf = globalThis.cancelAnimationFrame;

  // Override global timing functions for this scheduler instance
  // eslint-disable-next-line no-unused-vars
  globalThis.requestAnimationFrame = (callback) => {
    if (disposed) return 0;
    // Return a fake id - the callback will be invoked manually
    return ++nextId;
  };

  // eslint-disable-next-line no-unused-vars
  globalThis.cancelAnimationFrame = (id) => {
    // No-op for test controller
  };

  const controller = {
    /**
     * Advance the scheduler by one animation frame.
     * This will execute all registered frame callbacks with the current test time.
     */
    advanceFrame() {
      if (disposed) return;
      testTime += 16; // ~60fps
      frameCount++;
      currentTime = testTime;

      if (!paused) {
        frameCallbacks.forEach((cb) => {
          try {
            cb(currentTime);
          } catch {
            // ignore callback errors to keep the scheduler running
          }
        });

        const sec = Math.floor(currentTime / 1000);
        if (sec !== testLastSecond) {
          testLastSecond = sec;
          secondCallbacks.forEach((cb) => {
            try {
              cb(testTime);
            } catch {
              // ignore callback errors to keep the scheduler running
            }
          });
        }
      }
    },

    /**
     * Advance the test time by the specified number of milliseconds.
     * This will execute frame callbacks for each frame that would occur
     * in the given time span, and second callbacks when seconds change.
     *
     * @param {number} ms - Milliseconds to advance
     */
    advanceTime(ms) {
      if (disposed) return;
      const startTime = testTime;
      const targetTime = testTime + ms;
      const frameInterval = 16; // ~60fps

      while (testTime < targetTime) {
        const nextFrameTime = testTime + frameInterval;
        if (nextFrameTime > targetTime) break; // Don't execute frames beyond target time

        testTime = nextFrameTime;
        frameCount++;
        currentTime = testTime;

        if (!paused) {
          frameCallbacks.forEach((cb) => {
            try {
              cb(currentTime);
            } catch {
              // ignore callback errors to keep the scheduler running
            }
          });

          const sec = Math.floor(currentTime / 1000);
          if (sec !== testLastSecond) {
            testLastSecond = sec;
            secondCallbacks.forEach((cb) => {
              try {
                cb(testTime);
              } catch {
                // ignore callback errors to keep the scheduler running
              }
            });
          }
        }
      }

      // Check for second boundary crossing at the final target time
      const finalSec = Math.floor(targetTime / 1000);
      if (finalSec !== testLastSecond && targetTime > startTime) {
        testLastSecond = finalSec;
        if (!paused) {
          secondCallbacks.forEach((cb) => {
            try {
              cb(targetTime);
            } catch {
              // ignore callback errors to keep the scheduler running
            }
          });
        }
      }
    },

    /**
     * Get the number of frames that have been executed by this controller.
     *
     * @returns {number} Frame execution count
     */
    getFrameCount() {
      return frameCount;
    },

    /**
     * Clean up the test controller and restore original timing functions.
     */
    dispose() {
      if (disposed) return;
      disposed = true;
      globalThis.requestAnimationFrame = originalRaf;
      globalThis.cancelAnimationFrame = originalCaf;
    }
  };

  return controller;
}
