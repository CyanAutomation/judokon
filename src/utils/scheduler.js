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
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
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
  if (!running) return;
  running = false;
  cancelAnimationFrame(rafId);
  rafId = 0;
  frameCallbacks.clear();
  secondCallbacks.clear();
  lastSecond = undefined;
  currentTime = 0;
}
