/**
 * Guard utilities for managing concurrent operations and hidden properties.
 *
 * This module provides reusable utilities for guard management using Symbol-based
 * hidden properties to track state without polluting object namespaces.
 */

const hasOwn = Object.prototype.hasOwnProperty;

/**
 * Manage hidden properties on store objects with consolidated logic.
 *
 * @pseudocode
 * 1. Validate store is a valid object; return undefined if not.
 * 2. If action is "get", return the property value for the given token.
 * 3. If action is "set", define or update the property as non-enumerable.
 * 4. Use Object.defineProperty for new properties to ensure non-enumerable behavior.
 *
 * @param {object|null|undefined} store - Target object.
 * @param {symbol} token - Property token.
 * @param {"get"|"set"} action - Action to perform.
 * @param {any} [value] - Value for set action.
 * @returns {any}
 */
export function manageHiddenProperty(store, token, action, value) {
  if (!store || typeof store !== "object") {
    return undefined;
  }
  if (action === "get") {
    return store[token];
  }
  if (action === "set") {
    if (hasOwn.call(store, token)) {
      store[token] = value;
    } else {
      Object.defineProperty(store, token, {
        configurable: true,
        enumerable: false,
        writable: true,
        value
      });
    }
    return;
  }
  throw new Error(`Invalid action: ${action}. Expected "get" or "set".`);
}

/**
 * Set a hidden value on a store object.
 *
 * @pseudocode
 * 1. Call manageHiddenProperty with "set" action to store the value.
 *
 * @param {object|null|undefined} store - Target object.
 * @param {symbol} token - Property token.
 * @param {any} value - Value to set.
 * @returns {void}
 */
export function setHiddenStoreValue(store, token, value) {
  manageHiddenProperty(store, token, "set", value);
}

/**
 * Get a hidden value from a store object.
 *
 * @pseudocode
 * 1. Call manageHiddenProperty with "get" action to retrieve the value.
 *
 * @param {object|null|undefined} store - Target object.
 * @param {symbol} token - Property token.
 * @returns {any} The stored value or undefined.
 */
export function getHiddenStoreValue(store, token) {
  return manageHiddenProperty(store, token, "get");
}

/**
 * Guard management system for preventing concurrent operations.
 *
 * Uses Symbol-based hidden properties to track state without polluting the object's
 * enumerable namespace. This approach avoids WeakMap storage overhead while ensuring
 * non-enumerable, configurable properties that can be safely deleted.
 *
 * @pseudocode
 * 1. Check if store is a valid object; bail gracefully if not.
 * 2. Attempt to acquire guard token via hidden property.
 * 3. If token already exists, return { entered: false } (already held).
 * 4. Define non-enumerable property with guard token and return { entered: true }.
 * 5. Provide release() function that safely deletes the token property.
 *
 * @param {object|null|undefined} store - Target object to guard.
 * @param {symbol} token - Unique guard identifier (Symbol).
 * @returns {{ entered: boolean, release(): void }}
 */
export function enterGuard(store, token) {
  if (!store || typeof store !== "object") {
    return { entered: true, release() {} };
  }
  if (hasOwn.call(store, token)) {
    return { entered: false, release() {} };
  }
  Object.defineProperty(store, token, {
    configurable: true,
    enumerable: false,
    writable: true,
    value: true
  });
  return {
    entered: true,
    release() {
      try {
        delete store[token];
      } catch {}
    }
  };
}
