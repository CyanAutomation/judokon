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
