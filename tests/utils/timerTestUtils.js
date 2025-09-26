/**
 * Creates an incrementing timer identifier factory for deterministic tests.
 * @returns {() => number} Function that returns a unique timer ID on each call.
 * @pseudocode
 * set current to 0
 * return function that increments current and returns it
 */
export function createTimerIdFactory() {
  let current = 0;
  return () => {
    current += 1;
    return current;
  };
}

/**
 * Creates a timer ID manager that provides deterministic timer IDs for testing.
 * @returns {{reset: () => void, getNextTimeoutId: () => number, getNextIntervalId: () => number}}
 * Manager with reset, getNextTimeoutId, and getNextIntervalId methods.
 * @pseudocode
 * create timeout and interval factories
 * return object with:
 *   reset() - recreate both factories
 *   getNextTimeoutId() - get next timeout ID
 *   getNextIntervalId() - get next interval ID
 */
export function createTimerIdManager() {
  let nextTimeoutIdFactory = createTimerIdFactory();
  let nextIntervalIdFactory = createTimerIdFactory();

  return {
    reset() {
      nextTimeoutIdFactory = createTimerIdFactory();
      nextIntervalIdFactory = createTimerIdFactory();
    },
    getNextTimeoutId() {
      return nextTimeoutIdFactory();
    },
    getNextIntervalId() {
      return nextIntervalIdFactory();
    }
  };
}

/**
 * Stops or clears any provided timers, ignoring falsy values.
 * @param {...(number|{stop: Function})} timers Timers or timer-like objects to clear.
 * @pseudocode
 * for each timer provided
 *   if timer is falsy -> continue
 *   if timer has stop() -> call stop
 *   else -> clearTimeout and clearInterval with timer
 */
export function cleanupTimers(...timers) {
  timers.forEach((timer) => {
    if (!timer) return;

    if (typeof timer.stop === "function") {
      timer.stop();
      return;
    }

    clearTimeout(timer);
    clearInterval(timer);
  });
}
