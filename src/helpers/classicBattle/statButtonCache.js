/**
 * DOM query cache for stat buttons with auto-invalidation.
 *
 * Provides efficient caching of stat button elements with automatic
 * invalidation when the DOM tree changes.
 *
 * @module statButtonCache
 */

/**
 * Create a cached DOM element query with MutationObserver support.
 *
 * @pseudocode
 * 1. Cache query results and validate connectivity.
 * 2. Set up MutationObserver on query root.
 * 3. Provide manual invalidation and refresh methods.
 * 4. Clean up observer on disconnect.
 *
 * @param {string} selector - CSS selector to query
 * @param {string} rootId - ID of root element to observe
 * @returns {{
 *   get: () => HTMLElement[],
 *   invalidate: () => void,
 *   refresh: () => HTMLElement[]
 * }}
 */
export function createStatButtonCache(selector, rootId) {
  let cache = null;
  let observer = null;

  const invalidate = () => {
    cache = null;
    if (observer) {
      try {
        observer.disconnect();
      } catch {
        // Ignore observer cleanup failures
      }
      observer = null;
    }
  };

  const setupObserver = () => {
    if (observer) return; // Already set up
    if (typeof MutationObserver !== "function") return;

    try {
      const root = document?.getElementById?.(rootId);
      if (!root) return;

      observer = new MutationObserver(() => {
        invalidate();
      });
      observer.observe(root, { childList: true, subtree: true });
    } catch {
      // Silently fail observer setup
    }
  };

  const isValid = () => {
    if (!cache || cache.length === 0) return false;
    // Check that all cached elements are still connected
    return cache.every((el) => el?.isConnected !== false);
  };

  const refresh = () => {
    try {
      if (typeof document?.querySelectorAll === "function") {
        cache = Array.from(document.querySelectorAll(selector));
        setupObserver();
        return cache;
      }
    } catch {
      // Silently handle query errors
    }
    cache = [];
    return cache;
  };

  const get = () => {
    if (isValid()) {
      return cache;
    }
    return refresh();
  };

  return {
    get,
    invalidate,
    refresh
  };
}
