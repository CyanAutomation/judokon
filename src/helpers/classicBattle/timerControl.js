import { seededRandom } from "../testModeUtils.js";
import { getDefaultTimer } from "../timerUtils.js";
import { startRound as engineStartRound, startCoolDown, STATS } from "../battleEngine.js";
import * as infoBar from "../setupBattleInfoBar.js";
import { enableNextRoundButton, disableNextRoundButton, updateDebugPanel } from "./uiHelpers.js";

/**
 * Start the round timer and auto-select a random stat when time expires.
 *
 * @pseudocode
 * 1. Determine timer duration using `getDefaultTimer('roundTimer')`.
 * 2. Call `engineStartRound` to update the countdown each second.
 * 3. When expired, auto-select a random stat via `onExpired`.
 *
 * @param {function(string): void} onExpiredSelect - Callback to handle stat auto-selection.
 * @returns {Promise<void>} Resolves when the timer begins.
 */
export async function startTimer(onExpiredSelect) {
  const timerEl = document.getElementById("next-round-timer");
  let duration;
  try {
    duration = await getDefaultTimer("roundTimer");
  } catch {
    duration = 30;
  }
  if (typeof duration !== "number") duration = 30;
  engineStartRound(
    (remaining) => {
      if (timerEl) timerEl.textContent = `Time Left: ${remaining}s`;
    },
    () => {
      const randomStat = STATS[Math.floor(seededRandom() * STATS.length)];
      infoBar.showMessage(`Time's up! Auto-selecting ${randomStat}`);
      onExpiredSelect(randomStat);
    },
    duration
  );
}

/**
 * Enable the Next Round button after a cooldown period.
 *
 * @pseudocode
 * 1. If the match ended, return early.
 * 2. Setup a click handler that disables the button and calls `startRoundFn`.
 * 3. Start a 3 second cooldown via `startCoolDown` after a short delay.
 * 4. When expired, enable the button and attach the click handler.
 *
 * @param {{matchEnded: boolean}} result - Result from a completed round.
 * @param {function(): Promise<void>} startRoundFn - Function to begin the next round.
 */
export function scheduleNextRound(result, startRoundFn) {
  if (result.matchEnded) return;

  const btn = document.getElementById("next-round-button");
  if (!btn) return;

  const onClick = async () => {
    disableNextRoundButton();
    await startRoundFn();
  };

  const timerEl = document.getElementById("next-round-timer");

  const onTick = (remaining) => {
    if (timerEl) timerEl.textContent = `Next round in: ${remaining}s`;
  };

  const onExpired = () => {
    btn.addEventListener("click", onClick, { once: true });
    enableNextRoundButton();
    updateDebugPanel();
  };

  setTimeout(() => {
    startCoolDown(onTick, onExpired, 3);
  }, 2000);
}
