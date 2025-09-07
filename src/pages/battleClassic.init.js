import { setupScoreboard, updateScore, updateRoundCounter } from "../helpers/setupScoreboard.js";
import { createBattleEngine, getPointsToWin } from "../helpers/battleEngineFacade.js";
import { initRoundSelectModal } from "../helpers/classicBattle/roundSelectModal.js";

function init() {
  // Initialize scoreboard with no-op timer controls; orchestrator will provide real controls later
  setupScoreboard({ pauseTimer() {}, resumeTimer() {}, startCoolDown() {} });
  // Seed visible defaults to avoid invisible empty elements and enable a11y announcements
  try {
    updateScore(0, 0);
    updateRoundCounter(0);
    const rc = document.getElementById("round-counter");
    if (rc && !rc.textContent) rc.textContent = "Round 0";
  } catch {}

  // Initialize the battle engine and present the round selection modal.
  try {
    createBattleEngine();
    initRoundSelectModal(async () => {
      try {
        const pts = getPointsToWin();
        document.body.dataset.target = String(pts);
      } catch {}
    });
  } catch {}
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

export { init };
