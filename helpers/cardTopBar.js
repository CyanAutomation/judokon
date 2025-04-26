import { escapeHTML, getValue } from "./utils.js";
import { getCountryNameFromCode } from "./countryUtils.js";

const PLACEHOLDER_FLAG = "/countryFlags/placeholder-flag.png";

/**
 * Generates the top bar HTML for a judoka card, including name and flag.
 * @param {Object|null|undefined} judoka - The judoka object.
 * @param {string} [flagUrl] - The URL of the flag image.
 * @returns {Object} An object with title, flagUrl, and html properties.
 */
export function generateCardTopBar(judoka, flagUrl) {
  if (!judoka) {
    console.error("Judoka object is missing!");
    return {
      title: "No data",
      flagUrl: PLACEHOLDER_FLAG,
      html: `<div class="card-top-bar">No data available</div>`,
    };
  }

  const firstname = escapeHTML(getValue(judoka.name, "Unknown"));
  const surname = escapeHTML(getValue(judoka.surname, ""));
  const countryCode = getValue(judoka.country, "");
  const countryName = getCountryNameFromCode(countryCode);

  const fullTitle = `${firstname} ${surname}`.trim();
  const finalFlagUrl = flagUrl || PLACEHOLDER_FLAG;

  return {
    title: fullTitle,
    flagUrl: finalFlagUrl,
    html: `
      <div class="card-top-bar">
        <div class="card-name">
          <span class="firstname">${firstname}</span>
          <span class="surname">${surname}</span>
        </div>
        <img class="card-flag" src="${finalFlagUrl}" alt="${countryName} flag" 
          onerror="this.src='${PLACEHOLDER_FLAG}'">
      </div>
    `,
  };
}