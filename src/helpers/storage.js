import { debugLog } from "./debug.js";

const memoryStore = new Map();

/**
 * Retrieve a value from persistent storage.
 *
 * @pseudocode
 * 1. If `localStorage` is available, attempt to read the item.
 * 2. Parse the JSON string when present; return `null` on parse failure.
 * 3. When `localStorage` is unavailable, read from an in-memory Map.
 * 4. Return the parsed value or `null` if no data exists.
 *
 * @param {string} key - Storage key to read.
 * @returns {*} Parsed stored value or `null` when missing.
 */
export function getItem(key) {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }
  } catch (err) {
    debugLog("storage.getItem failed", err);
  }
  return memoryStore.get(key) ?? null;
}

/**
 * Persist a value to storage.
 *
 * @pseudocode
 * 1. Serialize `value` using `JSON.stringify`.
 * 2. When `localStorage` is available, write the stringified value.
 *    - On failure, fall back to the in-memory Map.
 * 3. If `localStorage` is unavailable, store the parsed value in memory.
 *
 * @param {string} key - Storage key to write.
 * @param {*} value - Value to store; must be JSON-serializable.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export function setItem(key, value) {
  try {
    const str = JSON.stringify(value);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, str);
      return;
    }
    memoryStore.set(key, value);
  } catch (err) {
    debugLog("storage.setItem failed", err);
    memoryStore.set(key, value);
  }
}

/**
 * Remove a value from storage.
 *
 * @pseudocode
 * 1. If `localStorage` is available, attempt to remove the entry.
 * 2. Always remove the key from the in-memory Map as a fallback.
 *
 * @param {string} key - Storage key to delete.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export function removeItem(key) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(key);
    }
  } catch (err) {
    debugLog("storage.removeItem failed", err);
  } finally {
    memoryStore.delete(key);
  }
}

/**
 * Create a thin wrapper around storage APIs with JSON safety and optional
 * fallback strategy.
 *
 * @pseudocode
 * 1. Return `{ get, set, remove }` bound to a specific key prefix.
 * 2. Use `localStorage` when available; otherwise fall back to in-memory map.
 * 3. Swallow JSON errors and remove corrupt values automatically.
 *
 * @param {string} key - Storage key to wrap.
 * @param {{ fallback?: 'session' }} [options]
 * @returns {{ get: () => any, set: (val:any) => void, remove: () => void }}
 */
export function wrap(key, { fallback = "session" } = {}) {
  const useMemory = () => fallback === "session" || typeof localStorage === "undefined";
  return {
    get() {
      try {
        if (!useMemory()) {
          const raw = localStorage.getItem(key);
          return raw ? JSON.parse(raw) : null;
        }
        return memoryStore.get(key) ?? null;
      } catch {
        try {
          if (!useMemory()) localStorage.removeItem(key);
        } catch {}
        memoryStore.delete(key);
        return null;
      }
    },
    set(val) {
      try {
        const str = JSON.stringify(val);
        if (!useMemory()) {
          localStorage.setItem(key, str);
          return;
        }
        memoryStore.set(key, val);
      } catch (err) {
        debugLog("storage.wrap.set failed", err);
        memoryStore.set(key, val);
      }
    },
    remove() {
      try {
        if (!useMemory()) localStorage.removeItem(key);
      } catch {}
      memoryStore.delete(key);
    }
  };
}
