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
 * @summary
 * Write a JSON-serializable value to persistent storage when available,
 * falling back to an in-memory store on error or in constrained environments.
 *
 * @pseudocode
 * 1. Attempt to JSON.stringify the provided `value`.
 * 2. If `localStorage` is available, write the serialized string to it.
 *    - If writing to `localStorage` fails (quota, security), log the error and
 *      store the original value in the in-memory fallback.
 * 3. If `localStorage` is not available, store the value in `memoryStore`.
 *
 * @param {string} key - Storage key to write.
 * @param {*} value - Value to store; should be JSON-serializable.
 * @returns {void}
 */
export function setItem(key, value) {
  try {
    const str = JSON.stringify(value);
    if (typeof localStorage !== "undefined") {
      // Prefer persistent localStorage when available.
      localStorage.setItem(key, str);
      return;
    }
    // Fallback to in-memory map for environments without localStorage.
    memoryStore.set(key, value);
  } catch (err) {
    // On any failure (circular refs, quota exceeded, or localStorage errors)
    // log and store in the in-memory fallback to avoid data loss.
    debugLog("storage.setItem failed", err);
    memoryStore.set(key, value);
  }
}

/**
 * Remove a value from storage.
 *
 * @summary
 * Safely remove an entry from persistent storage and the in-memory fallback.
 *
 * @pseudocode
 * 1. If `localStorage` is available, attempt `localStorage.removeItem(key)`
 *    inside a try/catch to avoid throwing in restricted environments.
 * 2. Always delete the key from the in-memory `memoryStore` in a finally-style
 *    manner to keep the fallback consistent.
 *
 * @param {string} key - Storage key to delete.
 * @returns {void}
 */
export function removeItem(key) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(key);
    }
  } catch (err) {
    // Keep failures quiet but observable in debug logs.
    debugLog("storage.removeItem failed", err);
  } finally {
    // Always remove from the in-memory store to keep state consistent.
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
