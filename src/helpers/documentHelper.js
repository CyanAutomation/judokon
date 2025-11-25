/**
 * Safe document reference helper for test environments.
 *
 * In test environments with multiple JSDOM instances or when functions are called
 * from event handlers, the global `document` reference may not be in scope.
 * This helper ensures consistent access to the correct document object.
 *
 * @returns {Document|null} The available document object, or null if none is found
 */
export function getDocumentRef() {
  try {
    if (typeof document !== "undefined" && document) {
      return document;
    }
  } catch {
    // Silently ignore
  }
  
  try {
    if (typeof globalThis !== "undefined" && globalThis?.document) {
      return globalThis.document;
    }
  } catch {
    // Silently ignore
  }
  
  try {
    if (typeof window !== "undefined" && window?.document) {
      return window.document;
    }
  } catch {
    // Silently ignore
  }
  
  return null;
}

/**
 * Get a safe getElementById that works in test environments.
 *
 * @param {string} id - Element ID to find
 * @returns {Element|null} The element or null
 */
export function safeGetElementById(id) {
  const doc = getDocumentRef();
  if (!doc) return null;
  try {
    return doc.getElementById(id);
  } catch {
    return null;
  }
}

/**
 * Get safe querySelectorAll that works in test environments.
 *
 * @param {string} selector - CSS selector
 * @returns {NodeList} Empty NodeList if document unavailable
 */
export function safeQuerySelectorAll(selector) {
  const doc = getDocumentRef();
  if (!doc) return [];
  try {
    return doc.querySelectorAll(selector);
  } catch {
    return [];
  }
}

/**
 * Get safe querySelector that works in test environments.
 *
 * @param {string} selector - CSS selector
 * @returns {Element|null} The element or null
 */
export function safeQuerySelector(selector) {
  const doc = getDocumentRef();
  if (!doc) return null;
  try {
    return doc.querySelector(selector);
  } catch {
    return null;
  }
}
