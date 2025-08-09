import { getCountryByCode, normalizeCode } from "../../utils/countryCodes.js";

/**
 * Resolve the country name for a two-letter code.
 *
 * @pseudocode
 * 1. Call `getCountryByCode(code)`.
 * 2. Return the resolved name when available.
 * 3. Default to "Vanuatu" if the lookup fails.
 *
 * @param {string} code - Two-letter country code.
 * @returns {Promise<string>} Resolved country name or "Vanuatu".
 */
export async function getCountryNameFromCode(code) {
  const name = await getCountryByCode(code);
  return name || "Vanuatu";
}

/**
 * Build the flag image URL for a country code.
 *
 * @pseudocode
 * 1. Normalize `countryCode`; return Vanuatu flag when invalid.
 * 2. Verify the code exists using `getCountryByCode`.
 * 3. Return the CDN URL for the normalized code or the Vanuatu flag when unresolved.
 *
 * @param {string} countryCode - Two-letter country code.
 * @returns {Promise<string>} URL for the flag image.
 */
export async function getFlagUrl(countryCode) {
  const normalized = normalizeCode(countryCode);
  if (!normalized) {
    console.warn("Invalid or missing country code. Defaulting to Vanuatu flag.");
    return "https://flagcdn.com/w320/vu.png";
  }

  const exists = await getCountryByCode(normalized);
  if (!exists) {
    console.warn("Invalid country code. Defaulting to Vanuatu flag.");
    return "https://flagcdn.com/w320/vu.png";
  }

  return `https://flagcdn.com/w320/${normalized}.png`;
}
