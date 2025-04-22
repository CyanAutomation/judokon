export { getValue, formatDate, generateCardTopBar };

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
  if (typeof value === "string") return value.trim() || fallback;
  return value ?? fallback; // Use nullish coalescing for better fallback handling
}

// Format a date string into a readable format
function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleDateString();
}

// Generate the top bar of the judoka card (name and flag)
function generateCardTopBar(judoka, flagUrl) {
  if (!judoka) {
    console.error("Judoka object is missing!");
    return `<div class="card-top-bar">No data available</div>`;
  }
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
  if (!judoka || !judoka.profileUrl) {
    return `<div class="card-portrait">No portrait available</div>`;
  }
  return `
    <div class="card-portrait">
      <img src="${judoka.profileUrl}" alt="${judoka.firstName} ${judoka.surname}'s portrait">
    </div>
  `;
}

function generateCardStats(judoka) {
  // Check if the judoka has stats available
  if (!judoka.stats) return `<div class="card-stats">No stats available</div>`;

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

function generateCardSignatureMove(judoka, gokyo) {
  // Find the technique in gokyo.json using the signatureMoveId
  console.log("Judoka ID:", judoka.signatureMoveId);
  const technique = gokyo.find(move => move.id === judoka.signatureMoveId);
  if (!technique) {
    console.warn(`No technique found for signatureMoveId: ${judoka.signatureMoveId}`);
  }
  // Get the technique name or fallback to "Unknown"
  const techniqueName = technique ? technique.name : "Unknown";

  // Return the HTML for the signature move
  return `<div class="card-signature"><strong>Signature Move:</strong> ${techniqueName}</div>`;
}

function generateCardLastUpdated(date) {
  return `<div class="card-updated">Last updated: ${date}</div>`;
}

// Generate HTML for a judoka card
export function generateJudokaCardHTML(judoka, gokyo) {
  console.log("Judoka:", judoka);
  console.log("Signature Move ID:", judoka.signatureMoveId);
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
        ${generateCardSignatureMove(judoka, gokyo)}
        ${generateCardLastUpdated(lastUpdated)}
      </div>
    </div>
  `;
}