/**
 * Validates testApi structure
 * @param {unknown} testApi - API to validate
 * @returns {boolean} Whether testApi is valid
 * @pseudocode
 * isValidTestApi(testApi):
 *   1. Check testApi is object
 *   2. Check testApi.timers exists and is object
 *   3. Return true if both conditions met, false otherwise
 */
export function isValidTestApi(testApi) {
  return Boolean(
    testApi && typeof testApi === "object" && testApi.timers && typeof testApi.timers === "object"
  );
}

/**
 * Sets up opponent delay control utilities for battle tests.
 *
 * @param {Object} testApi - The test API object containing timer controls.
 * @param {Object} testApi.timers - Timer API with opponent delay controls.
 * @param {Function} testApi.timers.setOpponentResolveDelay - Function to set opponent delay.
 * @returns {{
 *   setOpponentDelayToZero: () => Object,
 *   resetOpponentDelay: () => Object,
 *   setCustomDelay: (ms: number) => Object,
 *   getCurrentDelay: () => number|null,
 *   isDelayControlAvailable: () => boolean
 * }} Object with delay control methods (chainable).
 * @throws {TypeError} If testApi is not a valid object.
 *
 * @pseudocode
 * setupOpponentDelayControl(testApi):
 *   1. Validate testApi is valid object with timers
 *   2. Extract timer API from test API
 *   3. Check if delay control is available (setOpponentResolveDelay function exists)
 *   4. Create setDelay helper that tracks current delay state
 *   5. Return object with delay control methods
 *   6. Methods safely call setOpponentResolveDelay() if available, no-op otherwise
 *   7. All setters return this for chaining
 *
 * @example
 * const delayControl = setupOpponentDelayControl(testApi);
 * delayControl.setOpponentDelayToZero(); // Speed up opponent responses
 * // ... run test ...
 * delayControl.resetOpponentDelay(); // Restore default behavior
 *
 * @example Check if control is available
 * const control = setupOpponentDelayControl(testApi);
 * if (control.isDelayControlAvailable()) {
 *   control.setOpponentDelayToZero();
 * }
 *
 * @example Chaining
 * setupOpponentDelayControl(testApi)
 *   .setOpponentDelayToZero()
 *   .resetOpponentDelay();
 */
export function setupOpponentDelayControl(testApi) {
  if (!testApi || typeof testApi !== "object") {
    throw new TypeError("setupOpponentDelayControl requires a valid testApi object");
  }

  if (process.env.NODE_ENV === "production") {
    console.warn("setupOpponentDelayControl should only be used in tests");
  }

  const timerApi = testApi?.timers;
  const canControlDelay = typeof timerApi?.setOpponentResolveDelay === "function";
  let currentDelay = null;

  const setDelay = (value) => {
    if (canControlDelay) {
      currentDelay = value;
      timerApi.setOpponentResolveDelay(value);
    }
  };

  const api = {
    setOpponentDelayToZero() {
      setDelay(0);
      return api;
    },
    resetOpponentDelay() {
      setDelay(null);
      return api;
    },
    setCustomDelay(ms) {
      if (typeof ms !== "number" || ms < 0) {
        throw new TypeError("Delay must be a non-negative number");
      }
      setDelay(ms);
      return api;
    },
    getCurrentDelay() {
      return currentDelay;
    },
    isDelayControlAvailable() {
      return canControlDelay;
    }
  };

  return api;
}

/**
 * Creates a cleanup-friendly opponent delay controller
 * @param {Object} testApi - Test API object
 * @returns {{control: Object, cleanup: Function}} Controller with cleanup function
 * @throws {TypeError} If testApi is not valid
 *
 * @pseudocode
 * createOpponentDelayController(testApi):
 *   1. Create opponent delay control from testApi
 *   2. Store original delay value
 *   3. Return object with control and cleanup function
 *   4. Cleanup restores original delay or resets to null
 *
 * @example
 * const { control, cleanup } = createOpponentDelayController(testApi);
 * try {
 *   control.setOpponentDelayToZero();
 *   // ... run test ...
 * } finally {
 *   cleanup(); // Automatically restores original delay
 * }
 */
export function createOpponentDelayController(testApi) {
  const control = setupOpponentDelayControl(testApi);
  const originalDelay = control.getCurrentDelay();

  return {
    control,
    cleanup() {
      if (originalDelay !== null) {
        control.setCustomDelay(originalDelay);
      } else {
        control.resetOpponentDelay();
      }
    }
  };
}

/**
 * Emits a battle event and waits for async event handlers to complete.
 * Prevents timing bugs where tests check state before async handlers finish executing.
 *
 * @param {Function} emitBattleEvent - The emitBattleEvent function to call
 * @param {string} type - Event type to emit
 * @param {Object} [detail] - Event detail payload
 * @param {Object} timers - Timer control object with runAllTimersAsync method
 * @returns {Promise<void>} Resolves after event handlers complete
 * @throws {TypeError} If required parameters are invalid
 *
 * @pseudocode
 * emitBattleEventAndAwait(emitBattleEvent, type, detail, timers):
 *   1. Validate emitBattleEvent is a function
 *   2. Validate timers has runAllTimersAsync method
 *   3. Emit the battle event synchronously
 *   4. Wait for async handlers to complete via runAllTimersAsync
 *   5. Return resolved promise
 *
 * @example
 * import { emitBattleEvent } from "../../src/helpers/battleEventBus.js";
 * import { emitBattleEventAndAwait } from "../utils/battleTestUtils.js";
 *
 * // Instead of this (timing bug):
 * emitBattleEvent("statSelected", { opts: { delayOpponentMessage: true } });
 * expect(vi.getTimerCount()).toBe(1); // ❌ Fails - handler not done yet
 *
 * // Use this (correct):
 * await emitBattleEventAndAwait(emitBattleEvent, "statSelected",
 *   { opts: { delayOpponentMessage: true } }, timers);
 * expect(vi.getTimerCount()).toBe(1); // ✅ Passes - handler completed
 */
export async function emitBattleEventAndAwait(emitBattleEvent, type, detail, timers) {
  if (typeof emitBattleEvent !== "function") {
    throw new TypeError("emitBattleEvent must be a function");
  }
  if (!timers || typeof timers.runAllTimersAsync !== "function") {
    throw new TypeError("timers must have a runAllTimersAsync method");
  }

  // Emit event synchronously
  emitBattleEvent(type, detail);

  // Wait for async handlers to complete
  await timers.runAllTimersAsync();
}
