// Escape special characters to prevent XSS
const escapeMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;"
};

/**
 * Escapes HTML special characters to prevent XSS.
 *
 * Pseudocode:
 * 1. Convert the input `str` to a string using `String(str)` to ensure it is a string.
 *
 * 2. Use the `replace` method with a regular expression to find all occurrences of special HTML characters:
 *    - Match the characters `&`, `<`, `>`, `"`, and `'`.
 *
 * 3. For each matched character:
 *    - Look up the corresponding escaped value in the `escapeMap` object.
 *    - If the character exists in `escapeMap`, replace it with the escaped value.
 *    - If the character does not exist in `escapeMap`, leave it unchanged.
 *
 * 4. Return the resulting string with all special characters escaped.
 *
 * @param {string} str - The string to escape.
 * @returns {string} The escaped string.
 */
export function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (char) => escapeMap[char] || char);
}

/**
 * Gets a value or falls back to a default if the value is missing.
 *
 * Pseudocode:
 * 1. Check if the `value` is a string:
 *    - If it is a string, trim any whitespace.
 *    - If the trimmed string is empty, return the `fallback`.
 *    - Otherwise, return the trimmed string.
 *
 * 2. Check if the `value` is a number or a boolean:
 *    - If it is, return the `value` as-is.
 *
 * 3. Check if the `value` is an object, function, or symbol:
 *    - If it is, return the `fallback`.
 *
 * 4. For all other cases:
 *    - Use the nullish coalescing operator (`??`) to return the `value` if it is not `null` or `undefined`.
 *    - Otherwise, return the `fallback`.
 *
 * @param {*} value - The value to check.
 * @param {*} fallback - The fallback value if the input is invalid.
 * @returns {*} The value or the fallback.
 */
export function getValue(value, fallback = "Unknown") {
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "object" || typeof value === "function" || typeof value === "symbol") {
    return fallback;
  }
  return value ?? fallback;
}

/**
 * Formats a date string as YYYY-MM-DD or returns "Invalid Date".
 *
 * Pseudocode:
 * 1. Check if the `dateString` is a valid string:
 *    - If `dateString` is not a string or is empty (after trimming whitespace), return "Invalid Date".
 *
 * 2. Create a `Date` object using the `dateString`.
 *    - If the `Date` object is invalid (e.g., `isNaN(date.getTime())` is true), return "Invalid Date".
 *
 * 3. Convert the valid `Date` object to an ISO string using `toISOString`.
 *    - Split the ISO string at the "T" character to extract the date portion (YYYY-MM-DD).
 *
 * 4. Return the formatted date string (YYYY-MM-DD).
 *
 * @param {string} dateString - The date string to format.
 * @param {string} [locale="en-GB"] - The locale for formatting (currently unused).
 * @returns {string} The formatted date or "Invalid Date".
 */
export function formatDate(dateString, locale = "en-GB") {
  if (typeof dateString !== "string" || !dateString.trim()) {
    return "Invalid Date";
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";
  return date.toISOString().split("T")[0];
}
