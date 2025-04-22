// filepath: /workspaces/judokon/script.js
document.getElementById("startBtn").addEventListener("click", () => {
  document.getElementById("startBtn").classList.add("hidden");
  document.getElementById("gameArea").classList.remove("hidden");

  // Fetch and display judoka data
  fetch("data/judoka.json")
    .then((response) => response.json())
    .then((judokaData) => {
      displayJudokaCard(judokaData[0]); // Display the first judoka as an example
    })
    .catch((error) => {
      console.error("Error loading judoka data:", error);
      document.getElementById("gameArea").innerHTML = `
        <p>Failed to load game data. Please try again later.</p>
      `;
    });
});

function displayJudokaCard(judoka) {
  // Generate the flag URL using FlagCDN
  const flagUrl = `https://flagcdn.com/w320/${judoka.countryCode.toLowerCase()}.png`;

  // Render the judoka card
  document.getElementById("gameArea").innerHTML = `
    <div class="card">
      <div class="card-top-bar">
        <div class="card-name">
          <span class="first-name">${judoka.firstName}</span>
          <span class="surname">${judoka.surname}</span>
        </div>
        <img class="card-flag" src="${flagUrl}" alt="${judoka.country} flag">
      </div>
      <div class="card-portrait">
        <div class="card-weight-class">${judoka.weightClass}kg</div>
        <img src="path/to/placeholder-image.png" alt="${judoka.firstName} ${judoka.surname}">
      </div>
      <div class="card-stats">
        <div class="stat"><span>Power:</span> <span>${judoka.stats.power}</span></div>
        <div class="stat"><span>Speed:</span> <span>${judoka.stats.speed}</span></div>
        <div class="stat"><span>Technique:</span> <span>${judoka.stats.technique}</span></div>
        <div class="stat"><span>Kumi-kata:</span> <span>${judoka.stats.kumiKata}</span></div>
        <div class="stat"><span>Ne-waza:</span> <span>${judoka.stats.neWaza}</span></div>
      </div>
      <div class="card-signature">
        <span>Signature Move:</span>
        <span class="badge">${judoka.signatureMove}</span>
      </div>
      <div class="card-updated">
        <small>Last Updated: ${new Date(judoka.lastUpdated).toLocaleDateString()}</small>
      </div>
      <div class="card-profile">
        <a href="${judoka.profileUrl}" target="_blank" class="profile-link">Learn More</a>
      </div>
    </div>
  `;
}