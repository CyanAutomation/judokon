// filepath: /workspaces/judokon/script.js
document.getElementById("startBtn").addEventListener("click", async () => {
  const startBtn = document.getElementById("startBtn");
  const gameArea = document.getElementById("gameArea");
  const loadingIndicator = document.getElementById("loading");
  
  startBtn.addEventListener("click", async () => {
    startBtn.classList.add("hidden");
    loadingIndicator.classList.remove("hidden");
  
    try {
      const response = await fetch("data/judoka.json");
      const judokaData = await response.json();
      const randomIndex = Math.floor(Math.random() * judokaData.length);
      displayJudokaCard(judokaData[randomIndex]);
    } catch (error) {
      console.error("Error loading judoka data:", error);
      gameArea.innerHTML = `<p>Failed to load game data. Please try again later.</p>`;
    } finally {
      loadingIndicator.classList.add("hidden");
    }
  });

function getFlagUrl(countryCode) {
  return `https://flagcdn.com/w320/${countryCode?.toLowerCase() || "unknown"}.png`;
}

function generateJudokaCardHTML(judoka) {
  const flagUrl = getFlagUrl(judoka.countryCode);

  return `
    <div class="card">
      <div class="card-top-bar">
        <div class="card-name">
          <span class="first-name">${judoka.firstName || "Unknown"}</span>
          <span class="surname">${judoka.surname || "Unknown"}</span>
        </div>
        <img class="card-flag" src="${flagUrl}" alt="${judoka.country || "Unknown"} flag" onerror="this.src='path/to/placeholder-flag.png'">
      </div>
      <div class="card-portrait">
        <div class="card-weight-class">${judoka.weightClass || "N/A"}kg</div>
        <img src="path/to/placeholder-image.png" alt="${judoka.firstName || "Unknown"} ${judoka.surname || "Unknown"}">
      </div>
      <div class="card-stats">
        <div class="stat"><span>Power:</span> <span>${judoka.stats?.power || 0}</span></div>
        <div class="stat"><span>Speed:</span> <span>${judoka.stats?.speed || 0}</span></div>
        <div class="stat"><span>Technique:</span> <span>${judoka.stats?.technique || 0}</span></div>
        <div class="stat"><span>Kumi-kata:</span> <span>${judoka.stats?.kumiKata || 0}</span></div>
        <div class="stat"><span>Ne-waza:</span> <span>${judoka.stats?.neWaza || 0}</span></div>
      </div>
      <div class="card-signature">
        <span>Signature Move:</span>
        <span class="badge">${judoka.signatureMove || "Unknown"}</span>
      </div>
      <div class="card-updated">
        <small>Last Updated: ${judoka.lastUpdated ? new Date(judoka.lastUpdated).toLocaleDateString() : "N/A"}</small>
      </div>
      <div class="card-profile">
        <a href="${judoka.profileUrl || "#"}" target="_blank" class="profile-link">Learn More</a>
      </div>
    </div>
  `;
}

function displayJudokaCard(judoka) {
  const flagUrl = getFlagUrl(judoka.countryCode);
  document.getElementById("gameArea").innerHTML = generateJudokaCardHTML(judoka);
}