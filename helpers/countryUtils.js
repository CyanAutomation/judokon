import countryCodeMapping from "../data/countryCodeMapping.json";

const PLACEHOLDER_FLAG_URL = "/countryFlags/placeholder-flag.png";

/**
 * Returns the country name for a given code, or 'Unknown' if not found/active.
 * @param {string} code - The country code (e.g., "JP").
 * @returns {string} The country name (e.g., "Japan") or "Unknown" if not found.
 */
export function getCountryNameFromCode(code) {
  if (typeof code !== "string" || !code.trim()) return "Unknown";

  const match = countryCodeMapping.find(
    (entry) => entry.code.toLowerCase() === code.toLowerCase() && entry.active
  );

  return match ? match.country : "Unknown";
}

/**
 * Returns the flag URL for a given country code, or a placeholder if missing/invalid.
 * @param {string} countryCode - The country code (e.g., "JP").
 * @returns {string} The URL of the flag image or a placeholder URL if invalid.
 */
export function getFlagUrl(countryCode) {
  if (
    !countryCode ||
    !countryCodeMapping.some(
      (entry) => entry.code.toLowerCase() === countryCode.toLowerCase() && entry.active
    )
  ) {
    console.warn("Missing or invalid country code. Using placeholder flag.");
    return PLACEHOLDER_FLAG_URL;
  }

  return `https://flagcdn.com/w320/${countryCode.toLowerCase()}.png`;
}