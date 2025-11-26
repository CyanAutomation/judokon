/**
 * Provides a safe and robust method to retrieve the global `document` object,
 * specifically designed to handle various execution environments including
 * complex test setups (e.g., JSDOM with multiple instances) and event handlers
 * where the standard `document` reference might be out of scope or undefined.
 * It attempts to access the document through several common global references
 * to ensure maximum compatibility and resilience.
 *
 * @returns {Document|null} The active document object if found, otherwise `null`.
 *
 * @pseudocode
 * 1. Try to return direct `document` reference if available.
 * 2. Fallback to `globalThis.document` if direct reference fails.
 * 3. Fallback to `globalThis.window.document` with defensive checks.
 * 4. Return `null` if no document reference can be safely retrieved.
 */
export function getDocumentRef() {
  // Try direct document reference (most common case)
  try {
    if (typeof document !== "undefined" && document) {
      return document;
    }
  } catch {
    // Silently ignore - window might be a getter that throws
  }

  // Try globalThis.document
  try {
    if (globalThis && globalThis.document) {
      return globalThis.document;
    }
  } catch {
    // Silently ignore
  }

  // Try window.document as fallback (but be very defensive)
  try {
    // Use optional chaining to avoid triggering getters that might throw
    const maybeWindow = globalThis?.window;
    if (maybeWindow && maybeWindow.document) {
      return maybeWindow.document;
    }
  } catch {
    // Silently ignore
  }

  return null;
}

/**
 * Provides a safe wrapper around `Document.prototype.getElementById` that
 * first retrieves a valid `document` reference using `getDocumentRef`.
 * This ensures that element lookups are resilient in diverse environments,
 * particularly in test contexts where the global `document` might be
 * inconsistently available or mocked. It gracefully handles cases where
 * no document is found or an error occurs during the lookup.
 *
 * @param {string} id The unique identifier of the element to find.
 * @returns {Element|null} The HTMLElement with the specified `id`, or `null`
 *   if no such element exists, no document reference is available, or an error occurs.
 *
 * @pseudocode
 * 1. Obtain a document reference using `getDocumentRef`.
 * 2. If no document reference, return `null`.
 * 3. Attempt to find the element by ID using `document.getElementById(id)`.
 * 4. Return the found element or `null` if an error occurs.
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
 * Provides a safe wrapper around `Document.prototype.querySelectorAll` that
 * first retrieves a valid `document` reference using `getDocumentRef`.
 * This ensures that element lookups are resilient in diverse environments,
 * particularly in test contexts where the global `document` might be
 * inconsistently available or mocked. It gracefully handles cases where
 * no document is found or an error occurs during the lookup, returning
 * an empty `NodeList` to prevent runtime errors.
 *
 * @param {string} selector The CSS selector string to match.
 * @returns {NodeList} A static `NodeList` containing all elements that match
 *   the specified selector. Returns an empty `NodeList` if no document
 *   reference is available, no elements match, or an error occurs during lookup.
 *
 * @pseudocode
 * 1. Obtain a document reference using `getDocumentRef`.
 * 2. If no document reference, return an empty array (coerced to NodeList if needed).
 * 3. Attempt to find elements by selector using `document.querySelectorAll(selector)`.
 * 4. Return the found NodeList or an empty array if an error occurs.
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
 * Provides a safe wrapper around `Document.prototype.querySelector` that
 * first retrieves a valid `document` reference using `getDocumentRef`.
 * This ensures that element lookups are resilient in diverse environments,
 * particularly in test contexts where the global `document` might be
 * inconsistently available or mocked. It gracefully handles cases where
 * no document is found or an error occurs during the lookup.
 *
 * @param {string} selector The CSS selector string to match.
 * @returns {Element|null} The first HTMLElement that matches the specified
 *   selector, or `null` if no such element is found, no document reference
 *   is available, or an error occurs during lookup.
 *
 * @pseudocode
 * 1. Obtain a document reference using `getDocumentRef`.
 * 2. If no document reference, return `null`.
 * 3. Attempt to find the element by selector using `document.querySelector(selector)`.
 * 4. Return the found element or `null` if an error occurs.
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
