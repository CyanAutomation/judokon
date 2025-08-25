export const battleDomConfig = {};

/**
 * Resolve a DOM element from a reference or selector string.
 *
 * @pseudocode
 * 1. If `ref` is falsy, return null.
 * 2. If `ref` is a string and `document` exists, return `document.querySelector(ref)`.
 * 3. Otherwise, assume `ref` is already an element and return it.
 *
 * @param {Element|string|null|undefined} ref - Element reference or selector.
 * @returns {Element|null} Resolved DOM element or null.
 */
export function getDom(ref) {
  if (!ref) return null;
  if (typeof ref === "string") {
    try {
      return typeof document !== "undefined" ? document.querySelector(ref) : null;
    } catch {
      return null;
    }
  }
  return ref;
}
