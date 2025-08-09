const memoryStore = {};

/**
 * Retrieve a value from storage, parsing JSON and falling back to an in-memory store.
 *
 * @param {string} key - Storage key.
 * @returns {any|null} Parsed value or null when missing.
 */
export function getItem(key) {
  if (typeof key !== "string" || !key) return null;
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn(`Failed to read storage key "${key}"`, e);
    }
  }
  return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
}

/**
 * Store a value using JSON serialization with memory fallback.
 *
 * @param {string} key - Storage key.
 * @param {any} value - Value to store.
 */
export function setItem(key, value) {
  if (typeof key !== "string" || !key) return;
  const serialized = JSON.stringify(value);
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(key, serialized);
      return;
    } catch (e) {
      console.warn(`Failed to set storage key "${key}"`, e);
    }
  }
  memoryStore[key] = value;
}

/**
 * Remove a value from storage.
 *
 * @param {string} key - Storage key.
 */
export function removeItem(key) {
  if (typeof key !== "string" || !key) return;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`Failed to remove storage key "${key}"`, e);
    }
  }
  delete memoryStore[key];
}
