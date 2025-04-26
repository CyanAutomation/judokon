const PLACEHOLDER_FLAG_URL = "./assets/countryFlags/placeholder-flag.png";

/**
 * Escapes special HTML characters in a string to prevent XSS.
 * @param {string} str - The string to escape.
 * @returns {string} The escaped string.
 */
function escapeHTML(str) {
  if (typeof str !== "string") return str;
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generates the top bar HTML for a judoka card, including name and flag.
 * @param {Object|null|undefined} judoka - The judoka object.
 * @param {string} [flagUrl] - The URL of the flag image.
 * @returns {Object} An object with title, flagUrl, and html properties.
 */
export async function generateCardTopBar(judoka, flagUrl) {
  if (!judoka) {
    console.error("Judoka object is missing!");
    return {
      title: "No data",
      flagUrl: PLACEHOLDER_FLAG_URL,
      html: `<div class="card-top-bar">No data available</div>`,
    };
  }

  const firstname = escapeHTML(getValue(judoka.firstname, "Unknown"));
  const surname = escapeHTML(getValue(judoka.surname, ""));
  const countryCode = getValue(judoka.countryCode, "unknown");

  // Await the country name
  const countryName = countryCode !== "unknown" ? await getCountryNameFromCode(countryCode) : "Unknown";

  const fullTitle = `${firstname} ${surname}`.trim();
  const finalFlagUrl = flagUrl || PLACEHOLDER_FLAG_URL;

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
          onerror="this.src='${PLACEHOLDER_FLAG_URL}'">
      </div>
    `,
  };
}