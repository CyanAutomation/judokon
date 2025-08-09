import { getCountryName, getFlagUrl as serviceGetFlagUrl } from "../api/countryService.js";

/**
 * Resolve the country name for a two-letter code.
 *
 * @pseudocode
 * 1. Delegate to `getCountryName` from `countryService`.
 * 2. Return the resolved name.
 *
 * @param {string} code - Two-letter country code.
 * @returns {Promise<string>} Resolved country name or "Vanuatu".
 */
export function getCountryNameFromCode(code) {
  return getCountryName(code);
}

/**
 * Build the flag image URL for a country code.
 *
 * @pseudocode
 * 1. Delegate to `getFlagUrl` from `countryService`.
 * 2. Return the resolved URL.
 *
 * @param {string} countryCode - Two-letter country code.
 * @returns {Promise<string>} URL for the flag image.
 */
export function getFlagUrl(countryCode) {
  return serviceGetFlagUrl(countryCode);
}
