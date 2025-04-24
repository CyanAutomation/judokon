// Escape special characters to prevent XSS
export function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (char) => {
    const escapeMap = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }
    return escapeMap[char]
  })
}
// Get a value or fallback to a default if the value is missing
export function getValue(value, fallback = "Unknown") {
  if (typeof value === "string") return value.trim() || fallback
  return value ?? fallback // Use nullish coalescing for better fallback handling
}

export function formatDate(dateString) {
  if (typeof dateString !== 'string' || !dateString.trim()) {
    return "Invalid Date";
  }

  const date = new Date(dateString);
  return isNaN(date.getTime()) ? "Invalid Date" : date.toISOString().split("T")[0];
}