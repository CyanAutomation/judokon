/**
 * @summary Guard and hidden store utilities for managing internal state symbols.
 * @module storeGuard
 */

const hasOwn = Object.prototype.hasOwnProperty;

/**
 * @summary Enter a guarded section of store state.
 *
 * Attempts to acquire a guard token on the store object. If the token is already
 * present, returns `entered: false` to indicate the guard failed. Otherwise,
 * defines the token as a non-enumerable property and returns `entered: true`.
 *
 * @param {object} store - The store object to guard.
 * @param {symbol} token - The guard symbol or string key.
 * @returns {{entered: boolean, release: () => void}} Guard state and cleanup function.
 *
 * @pseudocode
 * 1. If store is not an object, return a no-op guard.
 * 2. If the token already exists on the store, return false (guard failed).
 * 3. Define the token as a non-enumerable property.
 * 4. Return a release function that deletes the token (best-effort cleanup).
 */
export function enterStoreGuard(store, token) {
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
      } catch (error) {
        // Cleanup is best-effort; ignore deletion errors.
        void error;
      }
    }
  };
}

/**
 * @summary Retrieve a hidden (non-enumerable) value from a store.
 *
 * @description Safely accesses a symbol or key that was stored as a non-enumerable property.
 *
 * @param {object} store - The store object.
 * @param {symbol|string} token - The key or symbol to retrieve.
 * @returns {any} The stored value, or `undefined` if not found or store is invalid.
 */
export function getHiddenStoreValue(store, token) {
  if (!store || typeof store !== "object") return undefined;
  return store[token];
}

/**
 * @summary Store a hidden (non-enumerable) value on a store object.
 *
 * @description Sets or updates a value as a non-enumerable property, preserving visibility
 * guards for internal state.
 *
 * @param {object} store - The store object.
 * @param {symbol|string} token - The key or symbol to define.
 * @param {any} value - The value to store.
 * @returns {void}
 */
export function setHiddenStoreValue(store, token, value) {
  if (!store || typeof store !== "object") {
    return;
  }
  if (hasOwn.call(store, token)) {
    store[token] = value;
    return;
  }
  Object.defineProperty(store, token, {
    configurable: true,
    enumerable: false,
    writable: true,
    value
  });
}
