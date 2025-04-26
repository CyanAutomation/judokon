const PLACEHOLDER_FLAG_URL = "./assets/countryFlags/placeholder-flag.png";

/**
 * Loads the country code mapping JSON from the server.
 * @returns {Promise<Array>} Resolves to an array of country code mappings.
 */
async function loadCountryCodeMapping() {
  const response = await fetch("./data/countryCodeMapping.json");
  if (!response.ok) {
    throw new Error("Failed to load country code mapping");
  }
  return response.json();
}

/**
 * Returns the country name for a given code, or 'Unknown' if not found/active.
 * @param {string} code - The country code (e.g., "JP").
 * @returns {Promise<string>} A promise that resolves to the country name or "Unknown".
 */
export async function getCountryNameFromCode(code) {
  if (typeof code !== "string" || !code.trim()) return "Unknown";

  const countryCodeMapping = await loadCountryCodeMapping();

  const match = countryCodeMapping.find(
    (entry) => entry.code.toLowerCase() === code.toLowerCase() && entry.active
  );

  return match ? match.country : "Unknown";
}

/**
 * Returns the flag URL for a given country code, or a placeholder if missing/invalid.
 * @param {string} countryCode - The country code (e.g., "JP").
 * @returns {Promise<string>} A promise that resolves to the flag URL.
 */
export async function getFlagUrl(countryCode) {
  if (!countryCode) {
    console.warn("Missing country code. Using placeholder flag.");
    return PLACEHOLDER_FLAG_URL;
  }

  const countryCodeMapping = await loadCountryCodeMapping();

  const isValid = countryCodeMapping.some(
    (entry) => entry.code.toLowerCase() === countryCode.toLowerCase() && entry.active
  );

  if (!isValid) {
    console.warn("Invalid country code. Using placeholder flag.");
    return PLACEHOLDER_FLAG_URL;
  }

  return `https://flagcdn.com/w320/${countryCode.toLowerCase()}.png`;
}