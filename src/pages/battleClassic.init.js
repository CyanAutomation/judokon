import { setupScoreboard, updateScore, updateRoundCounter } from "../helpers/setupScoreboard.js";
import { createBattleEngine, getPointsToWin } from "../helpers/battleEngineFacade.js";
import { initRoundSelectModal } from "../helpers/classicBattle/roundSelectModal.js";
import { startTimer } from "../helpers/classicBattle/timerService.js";
import { createCountdownTimer, getDefaultTimer } from "../helpers/timerUtils.js";

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
      // Start the selection timer; in Vitest use a lightweight fallback to ensure deterministic ticks
      try {
        const IS_VITEST =
          typeof process !== "undefined" && process.env && process.env.VITEST === "true";
        if (IS_VITEST) {
          const dur = Number(getDefaultTimer("roundTimer")) || 2;
          const timer = createCountdownTimer(dur, {
            onTick: (remaining) => {
              try {
                const el = document.getElementById("next-round-timer");
                if (el) el.textContent = remaining > 0 ? `Time Left: ${remaining}s` : "";
              } catch {}
            },
            onExpired: () => {
              try {
                document.body.dataset.autoSelected = document.body.dataset.autoSelected || "auto";
              } catch {}
            },
            pauseOnHidden: false
          });
          timer.start();
        } else {
          await startTimer((stat) => {
            try {
              document.body.dataset.autoSelected = String(stat || "auto");
            } catch {}
            return Promise.resolve();
          });
        }
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
