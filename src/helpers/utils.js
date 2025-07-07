import { debugLog } from "./debug.js";

// Escape special characters to prevent XSS
const escapeMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;"
};

/**
 * Escapes HTML special characters in a string.
 *
 * @pseudocode
 * 1. If input is null or undefined, return empty string.
 * 2. Convert input to string.
 * 3. Replace &, <, >, ', and " with their HTML entity equivalents.
 * 4. Return the escaped string.
 *
 * @param {string} str - The string to escape.
 * @returns {string} The escaped string.
 * @typedef {string} EscapedHTML
 */
export function escapeHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str).replace(/[&<>"']/g, (char) => escapeMap[char] || char);
}

// Decode common HTML entities back to characters
const decodeMap = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#039;": "'"
};

/**
 * Decodes basic HTML entities in a string.
 *
 * @pseudocode
 * 1. If input is null or undefined, return empty string.
 * 2. Convert input to string.
 * 3. Replace `&amp;`, `&lt;`, `&gt;`, `&quot;`, and `&#039;` with their corresponding characters.
 * 4. Return the decoded string.
 *
 * @param {string} str - The string containing HTML entities.
 * @returns {string} The decoded string.
 */
export function decodeHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str).replace(/&(amp|lt|gt|quot|#039);/g, (match) => decodeMap[match] || match);
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

  debugLog("Created Gokyo Lookup:", lookup);
  return lookup;
}
