// Generate flag URL
export function getFlagUrl(countryCode) {
  // If the country code is missing, return the placeholder flag from the assets/images directory
  if (!countryCode) {
    console.warn("Missing country code. Using placeholder flag.");
    return "assets/images/placeholder-flag.png";
  }
  // Return the URL for the country flag using FlagCDN
  return `https://flagcdn.com/w320/${countryCode.toLowerCase()}.png`;
}

// Get a value or fallback to a default if the value is missing
function getValue(value, fallback = "Unknown") {
  return value || fallback;
}

// Format a date string into a readable format
function formatDate(dateString) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString();
}

// Generate the top bar of the judoka card (name and flag)
function generateCardTopBar(judoka, flagUrl) {
  return `
    <div class="card-top-bar">
      <div class="card-name">
        <span class="first-name">${getValue(judoka.firstName)}</span>
        <span class="surname">${getValue(judoka.surname)}</span>
      </div>
      <img class="card-flag" src="${flagUrl}" alt="${getValue(judoka.country)} flag" 
        onerror="this.src='assets/images/placeholder-flag.png'">
    </div>
  `;
}

// Generate HTML for a judoka card
export function generateJudokaCardHTML(judoka) {
  // Generate the flag URL for the judoka's country
  const flagUrl = getFlagUrl(judoka.countryCode);

  // Extract and format judoka details with fallback values
  const firstName = getValue(judoka.firstName);
  const surname = getValue(judoka.surname);
  const country = getValue(judoka.country);
  const lastUpdated = formatDate(judoka.lastUpdated);

  // Return the complete HTML for the judoka card by combining different sections
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