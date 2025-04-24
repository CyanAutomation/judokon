export {getValue, formatDate, generateCardTopBar}

// Escape special characters to prevent XSS
export function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (char) => {
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return escapeMap[char];
  });
}

// Generate flag URL
export function getFlagUrl(countryCode) {
  // If the country code is missing, return the placeholder flag from the assets/images directory
  if (!countryCode) {
    console.warn("Missing country code. Using placeholder flag.")
    return "assets/images/placeholder-flag.png"
  }
  // Return the URL for the country flag using FlagCDN
  return `https://flagcdn.com/w320/${countryCode.toLowerCase()}.png`
}

// Get a value or fallback to a default if the value is missing
function getValue(value, fallback = "Unknown") {
  if (typeof value === "string") return value.trim() || fallback
  return value ?? fallback // Use nullish coalescing for better fallback handling
}

export function formatDate(dateString) {
  const date = new Date(dateString);
  return isNaN(date)
    ? 'Invalid Date'
    : date.toISOString().split('T')[0]; // returns '2025-04-24'
}

// Generate the top bar of the judoka card (name and flag)
export function generateCardTopBar(judoka, flagUrl) {
  if (!judoka) {
    console.error("Judoka object is missing!");
    return {
      title: 'No data',
      flagUrl: 'assets/images/placeholder-flag.png',
      html: `<div class="card-top-bar">No data available</div>`,
    };
  }

  const firstname = escapeHTML(getValue(judoka.firstname));
  const surname = escapeHTML(getValue(judoka.surname));
  const country = escapeHTML(getValue(judoka.country));

  const fullTitle = `${firstname} ${surname}`.trim();
  const finalFlagUrl = flagUrl || 'assets/images/placeholder-flag.png';

  return {
    title: `${getValue(judoka.firstname)} ${getValue(judoka.surname)}`.trim(), // unescaped title is fine for logic
    flagUrl: finalFlagUrl,
    html: `
      <div class="card-top-bar">
        <div class="card-name">
          <span class="firstname">${firstname}</span>
          <span class="surname">${surname}</span>
        </div>
        <img class="card-flag" src="${finalFlagUrl}" alt="${country} flag" 
          onerror="this.src='assets/images/placeholder-flag.png'">
      </div>
    `,
  };
}


function generateCardPortrait(judoka) {
  // Use the placeholder portrait if judoka is null, undefined, or has no valid ID
  const portraitUrl =
    judoka && judoka.id
      ? `assets/judokaPortraits/judokaPortrait-${judoka.id}.png`
      : `assets/judokaPortraits/judokaPortrait-0.png`;

  // Log the generated portrait URL for debugging
  console.log(`Generated portrait URL: ${portraitUrl}`);

  return `
    <div class="card-portrait">
      <img src="${portraitUrl}" alt="${judoka ? `${judoka.firstname} ${judoka.surname}'s portrait` : "Placeholder portrait"}" onerror="this.src='assets/judokaPortraits/judokaPortrait-0.png'">
    </div>
  `;
}

function generateCardStats(judoka) {
  // Check if the judoka has stats available
  if (!judoka.stats) return `<div class="card-stats">No stats available</div>`

  // Extract stats from the judoka object
  const {power, speed, technique, kumikata, newaza} = judoka.stats

  // Generate HTML for the stats section
  return `
    <div class="card-stats">
      <ul>
        <li class="stat"><strong>Power:</strong> <span>${power}</span></li>
        <li class="stat"><strong>Speed:</strong> <span>${speed}</span></li>
        <li class="stat"><strong>Technique:</strong> <span>${technique}</span></li>
        <li class="stat"><strong>Kumi-kata:</strong> <span>${kumikata}</span></li>
        <li class="stat"><strong>Ne-waza:</strong> <span>${newaza}</span></li>
      </ul>
    </div>
  `
}

export function generateCardSignatureMove(judoka, gokyo) {
  // Find the technique in gokyo.json using the signatureMoveId
  console.log("Judoka ID:", judoka.signatureMoveId)
  const technique = gokyo.find((move) => move.id === judoka.signatureMoveId)
  if (!technique) {
    console.warn(`No technique found for signatureMoveId: ${judoka.signatureMoveId}`)
  }
  // Get the technique name or fallback to "Unknown"
  const techniqueName = technique ? technique.name : "Unknown"

  // Return the HTML for the signature move with separate label and value
  return `
    <div class="card-signature">
      <span class="signature-move-label"><strong>Signature Move:</strong></span>
      <span class="signature-move-value">${techniqueName}</span>
    </div>
  `
}

function generateCardLastUpdated(date) {
  return `<div class="card-updated">Last updated: ${date}</div>`
}

// Generate HTML for a judoka card
export function generateJudokaCardHTML(judoka, gokyo) {
  console.log("Judoka:", judoka)
  console.log("Signature Move ID:", judoka.signatureMoveId)
  // Generate the flag URL for the judoka's country
  const flagUrl = getFlagUrl(judoka.countryCode)

  // Extract and format judoka details with fallback values
  const lastUpdated = formatDate(judoka.lastUpdated)

  // Return the complete HTML for the judoka card by combining different sections
  return `
    <div class="card-container">
      <div class="judoka-card">
        ${generateCardTopBar(judoka, flagUrl).html}
        ${generateCardPortrait(judoka)}
        ${generateCardStats(judoka)}
        ${generateCardSignatureMove(judoka, gokyo)}
        ${generateCardLastUpdated(lastUpdated)}
      </div>
    </div>
  `
}
