import countryCodeMapping from "../data/countryCodeMapping.json"

interface CountryCodeEntry {
  code: string
  country: string
  active: boolean
}

/**
 * Returns the country name for a given code, or 'Unknown' if not found/active.
 */
export function getCountryNameFromCode(code: string): string {
  if (typeof code !== "string" || !code.trim()) return "Unknown"
  const match = (countryCodeMapping as CountryCodeEntry[]).find(
    (entry) => entry.code.toLowerCase() === code.toLowerCase() && entry.active,
  )
  return match ? match.country : "Unknown"
}

/**
 * Returns the flag URL for a given country code, or a placeholder if missing/invalid.
 */
export function getFlagUrl(countryCode: string): string {
  if (
    !countryCode ||
    !(countryCodeMapping as CountryCodeEntry[]).some(
      (entry) => entry.code.toLowerCase() === countryCode.toLowerCase() && entry.active,
    )
  ) {
    console.warn("Missing or invalid country code. Using placeholder flag.")
    return "/countryFlags/placeholder-flag.png"
  }
  return `https://flagcdn.com/w320/${countryCode.toLowerCase()}.png`
}
