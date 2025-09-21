/**
 * Test utilities for verifying event listener wiring without fragile implementation details.
 *
 * These utilities focus on observable behavior rather than internal implementation,
 * providing opt-in helpers for testing event listener attachment and invocation.
 *
 * @module tests/helpers/listenerUtils
 */

/**
 * Wraps addEventListener on a target to spy on handler invocations for a specific event type.
 * Provides a clean API for testing event effects without direct DOM spying.
 *
 * @param {EventTarget} target - The event target to monitor
 * @param {string} eventName - The event type to spy on (e.g., 'click', 'keydown')
 * @param {Function} testFn - Test function that receives the call records and can trigger events
 * @returns {Promise<void>} Resolves when testFn completes
 *
 * @example
 * ```js
 * await withListenerSpy(button, 'click', async (calls) => {
 *   fireEvent.click(button);
 *   expect(calls).toHaveLength(1);
 *   expect(calls[0].type).toBe('click');
 * });
 * ```
 */
export async function withListenerSpy(target, eventName, testFn) {
  if (!target || typeof target.addEventListener !== "function") {
    throw new Error("Target must be an EventTarget with addEventListener method");
  }

  const calls = [];

  // Create a wrapper that captures calls
  const spyWrapper = (event) => {
    calls.push({
      type: event.type,
      target: event.target,
      currentTarget: event.currentTarget,
      event,
      timestamp: Date.now()
    });
  };

  // Add our spy wrapper (existing listeners will still run)
  target.addEventListener(eventName, spyWrapper);

  try {
    await testFn(calls);
  } finally {
    // Cleanup: remove our spy
    target.removeEventListener(eventName, spyWrapper);
  }
}

/**
 * Best-effort assertion that a listener is attached to a target for a given event.
 * This is primarily useful when combined with wrapAddEventListener() for opt-in tracking.
 *
 * @param {EventTarget} target - The event target to check
 * @param {string} eventName - The event type to check for
 * @returns {boolean} True if a listener appears to be attached (best effort)
 *
 * @example
 * ```js
 * // After wrapping addEventListener
 * setupComponent();
 * expect(expectListenerAttached(button, 'click')).toBe(true);
 * ```
 */
export function expectListenerAttached(target, eventName) {
  if (!target) return false;

  // Check if we've wrapped this target's addEventListener
  const wrapped = target._listenerUtilsWrapped;
  if (wrapped && wrapped.has(eventName)) {
    return true;
  }

  // Fallback: check for any existing listeners (limited browser support)
  const existing = getExistingListeners(target, eventName);
  return existing.length > 0;
}

/**
 * Opt-in wrapper that proxies addEventListener to track registrations.
 * This enables expectListenerAttached() to work reliably for wrapped targets.
 * Only affects targets that explicitly opt into wrapping.
 *
 * @param {EventTarget} target - The event target to wrap
 * @returns {Object} Control object with cleanup method
 *
 * @example
 * ```js
 * const wrapper = wrapAddEventListener(button);
 * setupComponent(); // Now expectListenerAttached will work
 * wrapper.cleanup(); // Restore original behavior
 * ```
 */
export function wrapAddEventListener(target) {
  if (!target || typeof target.addEventListener !== "function") {
    throw new Error("Target must be an EventTarget with addEventListener method");
  }

  // Mark this target as wrapped for tracking
  if (!target._listenerUtilsWrapped) {
    target._listenerUtilsWrapped = new Set();
  }

  const originalAdd = target.addEventListener;
  const originalRemove = target.removeEventListener;

  target.addEventListener = function wrappedAdd(type, handler, options) {
    target._listenerUtilsWrapped.add(type);
    return originalAdd.call(this, type, handler, options);
  };

  target.removeEventListener = function wrappedRemove(type, handler, options) {
    // Note: We don't remove from the set here as it's hard to track precisely
    // The set represents "ever had a listener of this type"
    return originalRemove.call(this, type, handler, options);
  };

  return {
    cleanup() {
      target.addEventListener = originalAdd;
      target.removeEventListener = originalRemove;
      delete target._listenerUtilsWrapped;
    }
  };
}

/**
 * Helper to get existing event listeners (limited browser support, best effort).
 * This is used internally and may not work in all environments.
 *
 * @private
 * @param {EventTarget} target - The event target
 * @param {string} eventName - The event type
 * @returns {Array} Array of handler functions (may be empty)
 */
function getExistingListeners(target, eventName) {
  // This is best-effort and may not work in all browsers/test environments
  try {
    // Check if the browser exposes listeners (limited support)
    if (target._events && target._events[eventName]) {
      return Array.isArray(target._events[eventName])
        ? target._events[eventName]
        : [target._events[eventName]];
    }

    // Check for jQuery-style event cache (if jQuery is present)
    if (target._events && target._events[eventName]) {
      return [target._events[eventName]];
    }

    // Check for common event emitter patterns
    if (target.listeners && typeof target.listeners === "function") {
      return target.listeners(eventName) || [];
    }
  } catch {
    // Ignore errors - this is best effort
  }

  return [];
}
