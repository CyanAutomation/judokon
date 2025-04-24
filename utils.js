// Escape special characters to prevent XSS
const escapeMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;",
};
/**
 * Escapes HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
export function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (char) => escapeMap[char]);
}

/**
 * Gets a value or fallback to a default if the value is missing.
 * @param {*} value
 * @param {*} fallback
 * @returns {*}
 */
export function getValue(value, fallback = "Unknown") {
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number" || typeof value === "boolean") return value;
  // Return fallback for objects, arrays, functions, symbols, etc.
  if (typeof value === "object" || typeof value === "function" || typeof value === "symbol") return fallback;
  return value ?? fallback;
}

/**
 * Formats a date string as YYYY-MM-DD or returns "Invalid Date".
 * @param {string} dateString
 * @param {string} [locale]
 * @returns {string}
 */
export function formatDate(dateString, locale = "en-GB") {
  if (typeof dateString !== 'string' || !dateString.trim()) {
    return "Invalid Date";
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";
  return date.toISOString().split("T")[0];
}