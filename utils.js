import gokyo from './data/gokyo.json'; // Import gokyo.json

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

function generateCardPortrait(judoka) {
  // TODO: Implement the portrait section of the judoka card
  return `<div class="card-portrait">[Portrait goes here]</div>`;
}

function generateCardStats(judoka) {
  // Extract stats from the judoka object
  const { power, speed, technique, kumiKata, neWaza } = judoka.stats;

  // Generate HTML for the stats section
  return `
    <div class="card-stats">
      <h3>Stats</h3>
      <ul>
        <li><strong>Power:</strong> ${power}</li>
        <li><strong>Speed:</strong> ${speed}</li>
        <li><strong>Technique:</strong> ${technique}</li>
        <li><strong>Kumi-kata:</strong> ${kumiKata}</li>
        <li><strong>Ne-waza:</strong> ${neWaza}</li>
      </ul>
    </div>
  `;
}

function generateCardSignatureMove(judoka) {
  // Find the technique in gokyo.json using the signatureMoveId
  const technique = gokyo.find(move => move.id === judoka.signatureMoveId);

  // Get the technique name or fallback to "Unknown"
  const techniqueName = technique ? technique.name : "Unknown";

  // Return the HTML for the signature move
  return `<div class="card-signature"><strong>Signature Move:</strong> ${techniqueName}</div>`;
}

function generateCardLastUpdated(date) {
  return `<div class="card-updated">Last updated: ${date}</div>`;
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
    <div class="card-container">
      <div class="judoka-card">
        ${generateCardTopBar(judoka, flagUrl)}
        ${generateCardPortrait(judoka)}
        ${generateCardStats(judoka)}
        ${generateCardSignatureMove(judoka)}
        ${generateCardLastUpdated(lastUpdated)}
      </div>
    </div>
  `;
}