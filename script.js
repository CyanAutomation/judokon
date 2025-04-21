document.getElementById("startBtn").addEventListener("click", () => {
  document.getElementById("startBtn").classList.add("hidden");
  document.getElementById("gameArea").classList.remove("hidden");

  // Temporary message
  document.getElementById("gameArea").innerHTML = `
    <p>The game will go here! Round 1 starting soon...</p>
  `;
});
