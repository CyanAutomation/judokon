import countryCodeMapping from "../data/countryCodeMapping.json"

/**
 * Returns the country name for a given code, or 'Unknown' if not found/active.
 * @param {string} code
 * @returns {string}
 */
export function getCountryNameFromCode(code) {
  if (typeof code !== "string" || !code.trim()) return "Unknown"
  const match = countryCodeMapping.find(
    (entry) => entry.code.toLowerCase() === code.toLowerCase() && entry.active,
  )
  return match ? match.country : "Unknown"
}

/**
 * Returns the flag URL for a given country code, or a placeholder if missing/invalid.
 * @param {string} countryCode
 * @returns {string}
 */
export function getFlagUrl(countryCode) {
  if (
    !countryCode ||
    !countryCodeMapping.some(
      (entry) => entry.code.toLowerCase() === countryCode.toLowerCase() && entry.active,
    )
  ) {
    console.warn("Missing or invalid country code. Using placeholder flag.")
    return "assets/images/placeholder-flag.png"
  }
  return `https://flagcdn.com/w320/${countryCode.toLowerCase()}.png`
}
