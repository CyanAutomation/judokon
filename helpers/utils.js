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
 * @pseudocode
 * 1. Ensure the input `str` is a string:
 *    - Convert `str` to a string using `String(str)` to handle non-string inputs.
 *
 * 2. Replace special HTML characters:
 *    - Use the `replace` method with a regular expression to match characters `&`, `<`, `>`, `"`, and `'`.
 *    - For each matched character:
 *      a. Look up the corresponding escaped value in the `escapeMap` object.
 *      b. Replace the character with its escaped value if found.
 *      c. Leave the character unchanged if not found in `escapeMap`.
 *
 * 3. Return the escaped string:
 *    - Ensure all special characters are replaced with their HTML-safe equivalents.
 *
 * @param {string} str - The string to escape.
 * @returns {string} The escaped string.
 * @typedef {string} EscapedHTML
 */
export function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (char) => escapeMap[char] || char);
}

/**
 * Gets a value or falls back to a default if the value is missing.
 *
 * @pseudocode
 * 1. Handle string values:
 *    - If `value` is a string, trim whitespace.
 *    - Return the trimmed string if it is not empty; otherwise, return `fallback`.
 *
 * 2. Handle number and boolean values:
 *    - If `value` is a number or boolean, return it as-is.
 *
 * 3. Handle invalid types:
 *    - If `value` is an object, function, or symbol, return `fallback`.
 *
 * 4. Handle nullish values:
 *    - Use the nullish coalescing operator (`??`) to return `value` if it is not `null` or `undefined`.
 *    - Otherwise, return `fallback`.
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
 * @pseudocode
 * 1. Validate the input:
 *    - If `dateString` is a `Date` object, check if it is valid using `isNaN(date.getTime())`.
 *    - If `dateString` is not a string or is empty after trimming, return "Invalid Date".
 *
 * 2. Parse the date:
 *    - Create a `Date` object using `dateString`.
 *    - If the `Date` object is invalid, return "Invalid Date".
 *
 * 3. Format the date:
 *    - Convert the valid `Date` object to an ISO string using `toISOString`.
 *    - Extract the date portion (YYYY-MM-DD) by splitting the ISO string at the "T" character.
 *
 * 4. Return the formatted date string:
 *    - Ensure the output is in the format YYYY-MM-DD or "Invalid Date".
 *
 * @param {string|Date} dateString - The date string or Date object to format.
 * @returns {string} The formatted date or "Invalid Date".
 */
export function formatDate(dateString) {
  if (dateString instanceof Date) {
    return isNaN(dateString.getTime()) ? "Invalid Date" : dateString.toISOString().split("T")[0];
  }
  if (typeof dateString !== "string" || !dateString.trim()) {
    return "Invalid Date";
  }
  const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";

  if (isoMatch) {
    const [, year, month, day] = isoMatch.map(Number);
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() + 1 !== month ||
      date.getUTCDate() !== day
    ) {
      return "Invalid Date";
    }
  }

  return date.toISOString().split("T")[0];
}

/**
 * Transforms gokyoData into a lookup object for quick access.
 *
 * @pseudocode
 * 1. Validate the input:
 *    - Check if `gokyoData` is an array and is not empty.
 *    - If invalid, log an error message and return an empty object.
 *
 * 2. Create the lookup object:
 *    - Use the `reduce` method to iterate over each `move` in the array.
 *    - For each `move`:
 *      a. Validate the `move` object (e.g., ensure `id` and `name` exist).
 *      b. Use the `id` property as the key and the entire `move` object as the value.
 *      c. Skip invalid entries and log a warning.
 *
 * 3. Return the lookup object:
 *    - Ensure the resulting object maps gokyo IDs to their corresponding entries.
 *
 * @param {GokyoEntry[]} gokyoData - Array of gokyo objects.
 * @returns {Object<string, GokyoEntry>} A lookup object with gokyo IDs as keys.
 */
export function createGokyoLookup(gokyoData) {
  if (!Array.isArray(gokyoData) || gokyoData.length === 0) {
    console.error("Invalid gokyoData: Expected a non-empty array.");
    return {};
  }

  const lookup = gokyoData.reduce((acc, move) => {
    if (!move.id || !move.name) {
      console.warn("Invalid GokyoEntry:", move);
      return acc;
    }
    acc[move.id] = move;
    return acc;
  }, {});

  console.log("Created Gokyo Lookup:", lookup);
  return lookup;
}
