import { seededRandom } from "../testModeUtils.js";
import { getDefaultTimer } from "../timerUtils.js";
import { startRound as engineStartRound, startCoolDown, STATS } from "../battleEngine.js";
import * as infoBar from "../setupBattleInfoBar.js";
import { enableNextRoundButton, disableNextRoundButton, updateDebugPanel } from "./uiHelpers.js";
import { runTimerWithDrift } from "./runTimerWithDrift.js";

/**
 * Start the round timer and auto-select a random stat when time expires.
 *
 * @pseudocode
 * 1. Determine timer duration using `getDefaultTimer('roundTimer')`.
 *    - On error, temporarily show "Waiting…" and fallback to 30 seconds.
 * 2. Use `runTimerWithDrift(engineStartRound)` to update the countdown each second
 *    and monitor for drift.
 *    - On drift show "Waiting…" and restart, giving up after several retries.
 * 3. When expired, auto-select a random stat via `onExpired`.
 *
 * @param {function(string): Promise<void>} onExpiredSelect - Callback to handle stat auto-selection.
 * @returns {Promise<void>} Resolves when the timer begins.
 */
export async function startTimer(onExpiredSelect) {
  const timerEl = document.getElementById("next-round-timer");
  let duration = 30;
  let synced = true;
  try {
    const val = await getDefaultTimer("roundTimer");
    if (typeof val === "number") {
      duration = val;
    } else {
      synced = false;
    }
  } catch {
    synced = false;
  }
  const restore = !synced ? infoBar.showTemporaryMessage("Waiting…") : () => {};

  const onTick = (remaining) => {
    if (!timerEl) return;
    if (remaining <= 0) {
      infoBar.clearTimer();
      return;
    }
    timerEl.textContent = `Time Left: ${remaining}s`;
  };

  const onExpired = async () => {
    infoBar.clearTimer();
    const randomStat = STATS[Math.floor(seededRandom() * STATS.length)];
    infoBar.showMessage(`Time's up! Auto-selecting ${randomStat}`);
    await onExpiredSelect(randomStat);
  };

  const run = runTimerWithDrift(engineStartRound);
  await run(duration, onTick, onExpired, async () => {
    infoBar.showMessage("Timer error. Auto-selecting stat.");
    await onExpired();
  });
  restore();
}

/**
 * Handle stalled stat selection by prompting the player and auto-selecting a
 * random stat.
 *
 * @pseudocode
 * 1. Display "Stat selection stalled" via `infoBar.showMessage`.
 * 2. After 5 seconds choose a random stat from `STATS`.
 * 3. Call `onSelect` with the chosen stat.
 *
 * @param {{autoSelectId: ReturnType<typeof setTimeout> | null}} store
 * - Battle state store.
 * @param {(stat: string) => void} onSelect - Callback to handle stat selection.
 */
export function handleStatSelectionTimeout(store, onSelect) {
  infoBar.showMessage("Stat selection stalled. Pick a stat or wait for auto-pick.");
  store.autoSelectId = setTimeout(() => {
    const randomStat = STATS[Math.floor(seededRandom() * STATS.length)];
    onSelect(randomStat);
  }, 5000);
}

/**
 * Enable the Next Round button after a cooldown period.
 *
 * @pseudocode
 * 1. If the match ended, return early.
 * 2. Setup a click handler that disables the button and calls `startRoundFn`.
 * 3. After a short delay, run a 3 second cooldown via `runTimerWithDrift(startCoolDown)`.
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
    if (!timerEl) return;
    if (remaining <= 0) {
      infoBar.clearTimer();
      return;
    }
    timerEl.textContent = `Next round in: ${remaining}s`;
  };

  const onExpired = () => {
    infoBar.clearTimer();
    btn.addEventListener("click", onClick, { once: true });
    enableNextRoundButton();
    updateDebugPanel();
  };

  const run = runTimerWithDrift(startCoolDown);
  setTimeout(() => {
    run(3, onTick, onExpired, () => {
      infoBar.showMessage("Timer error. Enabling next round.");
      onExpired();
    });
  }, 2000);
}
