import { seededRandom } from "../testModeUtils.js";
import { getDefaultTimer } from "../timerUtils.js";
import {
  startRound as engineStartRound,
  startCoolDown,
  STATS,
  stopTimer
} from "../battleEngine.js";
import * as infoBar from "../setupBattleInfoBar.js";
import { enableNextRoundButton, disableNextRoundButton, updateDebugPanel } from "./uiHelpers.js";
import { runTimerWithDrift } from "./runTimerWithDrift.js";
import { showSnackbar, updateSnackbar } from "../showSnackbar.js";

let skipHandler = null;
let pendingSkip = false;
const AUTO_SELECT_FEEDBACK_MS = 500;

/**
 * Set the current skip handler and notify listeners of its presence.
 * If a skip was requested before a handler existed, invoking this with
 * a function will immediately trigger it and clear the pending state.
 *
 * @param {null|function(): void|Promise<void>} fn - Handler to invoke when skipping.
 * @returns {void}
 */
export function setSkipHandler(fn) {
  skipHandler = typeof fn === "function" ? fn : null;
  window.dispatchEvent(
    new CustomEvent("skip-handler-change", {
      detail: { active: Boolean(skipHandler) }
    })
  );
  if (pendingSkip && skipHandler) {
    pendingSkip = false;
    const current = skipHandler;
    skipHandler = null;
    window.dispatchEvent(new CustomEvent("skip-handler-change", { detail: { active: false } }));
    current();
  }
}

/**
 * Skip the current timer phase if a handler is set. When no handler is
 * available, mark the skip as pending so it runs once a handler is provided.
 *
 * @returns {void}
 */
export function skipCurrentPhase() {
  if (skipHandler) {
    const fn = skipHandler;
    setSkipHandler(null);
    fn();
  } else {
    pendingSkip = true;
  }
}

/**
 * Start the round timer and auto-select a random stat when time expires.
 *
 * @pseudocode
 * 1. Determine timer duration using `getDefaultTimer('roundTimer')`.
 *    - On error, temporarily show "Waiting…" and fallback to 30 seconds.
 * 2. Use `runTimerWithDrift(engineStartRound)` to update the countdown each second
 *    and monitor for drift.
 *    - On drift show "Waiting…" and restart, giving up after several retries.
 * 3. Register a skip handler that stops the timer and triggers `onExpired`.
 * 4. When expired, highlight a random stat button, announce the choice via the
 *    info bar and snackbar, wait `AUTO_SELECT_FEEDBACK_MS`, invoke
 *    `onExpiredSelect` with `delayOpponentMessage` set, and clear the handler.
 *
 * @param {(stat: string, opts?: { delayOpponentMessage?: boolean }) => Promise<void>} onExpiredSelect
 * - Callback to handle stat auto-selection.
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
    setSkipHandler(null);
    infoBar.clearTimer();
    const randomStat = STATS[Math.floor(seededRandom() * STATS.length)];
    const btn = document.querySelector(`#stat-buttons button[data-stat="${randomStat}"]`);
    const label = btn?.textContent || randomStat;
    if (btn) {
      btn.classList.add("selected");
    }
    infoBar.showAutoSelect(label);
    showSnackbar(`Time's up! Auto-selecting ${label}`);
    await new Promise((resolve) => setTimeout(resolve, AUTO_SELECT_FEEDBACK_MS));
    await onExpiredSelect(randomStat, { delayOpponentMessage: true });
  };

  setSkipHandler(async () => {
    stopTimer();
    await onExpired();
  });

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
 * 3. Highlight the stat button, show an auto-select message, wait
 *    `AUTO_SELECT_FEEDBACK_MS`, and call `onSelect` with the chosen stat and
 *    `delayOpponentMessage` option.
 *
 * @param {{autoSelectId: ReturnType<typeof setTimeout> | null}} store
 * - Battle state store.
 * @param {(stat: string, opts?: { delayOpponentMessage?: boolean }) => void} onSelect
 * - Callback to handle stat selection.
 */
export function handleStatSelectionTimeout(store, onSelect) {
  infoBar.showMessage("Stat selection stalled. Pick a stat or wait for auto-pick.");
  store.autoSelectId = setTimeout(async () => {
    const randomStat = STATS[Math.floor(seededRandom() * STATS.length)];
    const btn = document.querySelector(`#stat-buttons button[data-stat="${randomStat}"]`);
    const label = btn?.textContent || randomStat;
    if (btn) {
      btn.classList.add("selected");
    }
    infoBar.showAutoSelect(label);
    showSnackbar(`Time's up! Auto-selecting ${label}`);
    await new Promise((resolve) => setTimeout(resolve, AUTO_SELECT_FEEDBACK_MS));
    onSelect(randomStat, { delayOpponentMessage: true });
  }, 5000);
}

/**
 * Enable the Next Round button after a cooldown period.
 *
 * @pseudocode
 * 1. If the match ended, return early.
 * 2. Setup a click handler that disables the button and calls `startRoundFn`.
 * 3. After a short delay, run a 3 second cooldown via `runTimerWithDrift(startCoolDown)`
 *    and display `"Next round in: <n>s"` using one snackbar that updates each tick.
 * 4. Register a skip handler that stops the timer and invokes the expiration logic.
 * 5. When expired, clear the `#next-round-timer` element, enable the button, attach the click
 *    handler, and clear the handler.
 *
 * @param {{matchEnded: boolean}} result - Result from a completed round.
 * @param {function(): Promise<void>} startRoundFn - Function to begin the next round.
 */
export function scheduleNextRound(result, startRoundFn) {
  if (result.matchEnded) {
    setSkipHandler(null);
    return;
  }

  const btn = document.getElementById("next-round-button");
  if (!btn) return;
  const timerEl = document.getElementById("next-round-timer");

  const onClick = async () => {
    disableNextRoundButton();
    await startRoundFn();
  };

  let started = false;
  const onTick = (remaining) => {
    if (remaining <= 0) {
      infoBar.clearTimer();
      return;
    }
    const text = `Next round in: ${remaining}s`;
    if (!started) {
      showSnackbar(text);
      started = true;
    } else {
      updateSnackbar(text);
    }
  };

  const onExpired = () => {
    setSkipHandler(null);
    infoBar.clearTimer();
    if (timerEl) {
      timerEl.textContent = "";
    }
    btn.addEventListener("click", onClick, { once: true });
    enableNextRoundButton();
    updateDebugPanel();
  };

  setSkipHandler(() => {
    stopTimer();
    onExpired();
  });

  const run = runTimerWithDrift(startCoolDown);
  setTimeout(() => {
    run(3, onTick, onExpired, () => {
      infoBar.showMessage("Timer error. Enabling next round.");
      onExpired();
    });
  }, 2000);
}
