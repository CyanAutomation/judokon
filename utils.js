// Generate flag URL
export function getFlagUrl(countryCode) {
  if (!countryCode) {
    console.warn("Missing country code. Using placeholder flag.");
    return "path/to/placeholder-flag.png";
  }
  return `https://flagcdn.com/w320/${countryCode.toLowerCase()}.png`;
}

function getValue(value, fallback = "Unknown") {
  return value || fallback;
}
function formatDate(dateString) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString();
}
// Generate HTML for a judoka card
export function generateJudokaCardHTML(judoka) {
  const flagUrl = getFlagUrl(judoka.countryCode);
  const firstName = getValue(judoka.firstName);
  const surname = getValue(judoka.surname);
  const country = getValue(judoka.country);
  const lastUpdated = formatDate(judoka.lastUpdated);

  return `
    <div class="card">
      ${generateCardTopBar(judoka, flagUrl)}
      ${generateCardPortrait(judoka)}
      ${generateCardStats(judoka)}
      ${generateCardSignature(judoka)}
      ${generateCardUpdated(lastUpdated)}
      ${generateCardProfile(judoka)}
    </div>
  `;
}

function generateCardTopBar(judoka, flagUrl) {
return `
  <div class="card-top-bar">
    <div class="card-name">
      <span class="first-name">${getValue(judoka.firstName)}</span>
      <span class="surname">${getValue(judoka.surname)}</span>
    </div>
    <img class="card-flag" src="${flagUrl}" alt="${getValue(judoka.country)} flag" onerror="this.src='path/to/placeholder-flag.png'">
  </div>
`;
}