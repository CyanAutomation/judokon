// Escape special characters to prevent XSS
const escapeMap: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;",
}

/**
 * Escapes HTML special characters to prevent XSS.
 * @param str - The string to escape.
 * @returns The escaped string.
 */
export function escapeHTML(str: string): string {
  return String(str).replace(/[&<>"']/g, (char) => escapeMap[char] || char)
}

/**
 * Gets a value or falls back to a default if the value is missing.
 * @param value - The value to check.
 * @param fallback - The fallback value if the input is invalid.
 * @returns The value or the fallback.
 */
export function getValue<T>(value: T, fallback: T = "Unknown" as T): T {
  if (typeof value === "string") return (value.trim() || fallback) as T
  if (typeof value === "number" || typeof value === "boolean") return value
  // Return fallback for objects, arrays, functions, symbols, etc.
  if (typeof value === "object" || typeof value === "function" || typeof value === "symbol")
    return fallback
  return value ?? fallback
}

/**
 * Formats a date string as YYYY-MM-DD or returns "Invalid Date".
 * @param dateString - The date string to format.
 * @param locale - The locale for formatting (currently unused).
 * @returns The formatted date or "Invalid Date".
 */
export function formatDate(dateString: string, locale: string = "en-GB"): string {
  if (typeof dateString !== "string" || !dateString.trim()) {
    return "Invalid Date"
  }
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return "Invalid Date"
  return date.toISOString().split("T")[0]
}
