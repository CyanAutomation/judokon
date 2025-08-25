import { getDefaultTimer } from "../timerUtils.js";
import { startRound as engineStartRound, startCoolDown, stopTimer } from "../battleEngineFacade.js";
import * as scoreboard from "../setupScoreboard.js";
import { updateDebugPanel } from "./uiHelpers.js";
import * as snackbar from "../showSnackbar.js";
import { setSkipHandler } from "./skipHandler.js";
import { autoSelectStat } from "./autoSelectStat.js";
import { emitBattleEvent } from "./battleEvents.js";
import { realScheduler } from "../scheduler.js";
import * as testModeUtils from "../testModeUtils.js";
import { dispatchBattleEvent } from "./battleDispatcher.js";

/**
 * Store controls for the pending next round. Updated by `scheduleNextRound`
 * and consumed by `onNextButtonClick` when invoked via the Next button.
 * @type {{timer: ReturnType<typeof createRoundTimer>|null, resolveReady: (()=>void)|null, ready: Promise<void>|null}|null}
 */
let currentNextRound = null;

// Skip handler utilities moved to skipHandler.js

/**
 * Handle clicks on the Next button. Uses the active timer controls provided by
 * `scheduleNextRound` to either resolve the ready promise or cancel the timer.
 *
 * @param {MouseEvent} _evt - Click event.
 * @param {{timer: {stop: () => void} | null, resolveReady: (() => void) | null}} [controls=currentNextRound]
 * - Timer controls returned from `scheduleNextRound`.
 */
export async function onNextButtonClick(_evt, { timer, resolveReady } = currentNextRound ?? {}) {
  const btn = document.getElementById("next-button");
  if (!btn) return;

  if (btn.dataset.nextReady === "true") {
    btn.disabled = true;
    delete btn.dataset.nextReady;
    await dispatchBattleEvent("ready");
    if (typeof resolveReady === "function") {
      resolveReady();
    }
    setSkipHandler(null);
    return;
  }

  if (timer) {
    timer.stop();
  }
}

/**
 * Expose current next-round controls for helpers like `setupNextButton`.
 *
 * @returns {{timer: ReturnType<typeof createRoundTimer>|null, resolveReady: (()=>void)|null, ready: Promise<void>|null}|null}
 */
export function getNextRoundControls() {
  return currentNextRound;
}

/**
 * Helper to force auto-select and dispatch outcome on timer error or drift.
 *
 * @pseudocode
 * 1. Show error message via scoreboard.
 * 2. Call autoSelectStat with the provided callback.
 * 3. Ensure the outcome event is dispatched so the state machine progresses.
 *
 * @param {(stat: string, opts?: { delayOpponentMessage?: boolean }) => Promise<void>} onExpiredSelect
 * - Callback to handle stat auto-selection.
 * @returns {Promise<void>}
 */
async function forceAutoSelectAndDispatch(onExpiredSelect) {
  scoreboard.showMessage("Timer error. Auto-selecting stat.");
  try {
    await autoSelectStat(onExpiredSelect);
  } catch {
    // If auto-select fails, dispatch interrupt to avoid stalling
    await dispatchBattleEvent("interrupt");
  }
}

/**
 * Start the round timer and auto-select a random stat on expiration.
 *
 * @pseudocode
 * 1. Determine timer duration using `getDefaultTimer('roundTimer')`.
 *    - On error, temporarily show "Waiting…" and fallback to 30 seconds.
 * 2. Start the timer via `engineStartRound` and monitor for drift.
 *    - On drift trigger auto-select logic and dispatch the outcome event.
 * 3. Register a skip handler that stops the timer and triggers `onExpired`.
 * 4. When expired, dispatch "timeout" and call `autoSelectStat` to pick a stat
 *    and invoke `onExpiredSelect` with `delayOpponentMessage`.
 *
 * @param {(stat: string, opts?: { delayOpponentMessage?: boolean }) => Promise<void>} onExpiredSelect
 * - Callback to handle stat auto-selection.
 * @returns {Promise<void>} Resolves when the timer begins.
 */
export async function startTimer(onExpiredSelect) {
  const timerEl = document.getElementById("next-round-timer");
  let duration = 30;
  let synced = true;

  const onTick = (remaining) => {
    if (!timerEl) return;
    if (remaining <= 0) {
      scoreboard.clearTimer();
      return;
    }
    timerEl.textContent = `Time Left: ${remaining}s`;
  };

  const onExpired = async () => {
    setSkipHandler(null);
    scoreboard.clearTimer();
    await dispatchBattleEvent("timeout");
    await autoSelectStat(onExpiredSelect);
  };

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
  const restore = !synced ? scoreboard.showTemporaryMessage("Waiting…") : () => {};

  const timer = createRoundTimer(onTick, onExpired, {
    starter: engineStartRound,
    onDriftFail: () => forceAutoSelectAndDispatch(onExpiredSelect)
  });

  setSkipHandler(() => timer.stop());

  timer.start(duration);
  restore();
}

/**
 * Handle stalled stat selection by prompting the player and auto-selecting a
 * random stat.
 *
 * @pseudocode
 * 1. Display "Stat selection stalled" via `scoreboard.showMessage`.
 * 2. After `timeoutMs` milliseconds call `autoSelectStat(onSelect)`.
 *
 * @param {{autoSelectId: ReturnType<typeof setTimeout> | null}} store
 * - Battle state store.
 * @param {(stat: string, opts?: { delayOpponentMessage?: boolean }) => void} onSelect
 * - Callback to handle stat selection.
 * @param {number} [timeoutMs=5000] - Delay before auto-selecting.
 */
export function handleStatSelectionTimeout(
  store,
  onSelect,
  timeoutMs = 5000,
  scheduler = realScheduler
) {
  scoreboard.showMessage("Stat selection stalled. Pick a stat or wait for auto-pick.");
  store.autoSelectId = scheduler.setTimeout(() => {
    autoSelectStat(onSelect);
  }, timeoutMs);
}

export function createRoundTimer(onTick, onExpired, { starter = startCoolDown, onDriftFail } = {}) {
  const MAX_DRIFT_RETRIES = 3;
  let retries = 0;

  function start(dur) {
    return starter(onTick, onExpiredInternal, dur, handleDrift);
  }

  async function onExpiredInternal() {
    await onExpired();
  }

  async function handleDrift(remaining) {
    retries += 1;
    if (retries > MAX_DRIFT_RETRIES) {
      if (typeof onDriftFail === "function") {
        await onDriftFail();
      } else {
        await onExpiredInternal();
      }
      return;
    }
    const msgEl = document.getElementById("round-message");
    if (msgEl && msgEl.textContent) {
      snackbar.showSnackbar("Waiting…");
    } else {
      scoreboard.showMessage("Waiting…");
    }
    await start(remaining);
  }

  function stop() {
    stopTimer();
    onExpiredInternal();
  }

  return { start, stop };
}

/**
 * Enable the Next Round button after a cooldown period.
 *
 * @pseudocode
 * 1. If the match ended, resolve immediately.
 * 2. Locate `#next-button` and `#next-round-timer`.
 * 3. After a short delay, run a cooldown (default 3 seconds or
 *    `window.__NEXT_ROUND_COOLDOWN_MS`) via `startCoolDown` and display
 *    `"Next round in: <n>s"` using one snackbar that updates each tick.
 * 4. Register a skip handler that stops the timer and invokes the expiration logic.
 * 5. When expired, clear the `#next-round-timer` element, set `data-next-ready="true"`,
 *    enable the Next Round button, dispatch `"ready"` to auto-advance the state machine,
 *    and resolve the returned promise.
 *
 * @param {{matchEnded: boolean}} result - Result from a completed round.
 * @returns {{
 *   ready: Promise<void>,
 *   timer: ReturnType<typeof createRoundTimer> | null,
 *   resolveReady: (() => void) | null
 * }} Controls for the scheduled next round.
 */
export function scheduleNextRound(result, scheduler = realScheduler) {
  const controls = { timer: null, resolveReady: null, ready: null };

  controls.ready = new Promise((resolve) => {
    controls.resolveReady = () => {
      emitBattleEvent("nextRoundTimerReady");
      resolve();
      controls.resolveReady = null;
    };
  });

  if (result.matchEnded) {
    setSkipHandler(null);
    if (controls.resolveReady) controls.resolveReady();
    currentNextRound = controls;
    return controls;
  }

  const btn = document.getElementById("next-button");
  const timerEl = document.getElementById("next-round-timer");

  let snackbarStarted = false;
  let lastRenderedRemaining = -1;

  const overrideMs =
    typeof window !== "undefined" && typeof window.__NEXT_ROUND_COOLDOWN_MS === "number"
      ? window.__NEXT_ROUND_COOLDOWN_MS
      : 3000;
  // In test mode, remove cooldown to make transitions deterministic.
  let cooldownSeconds;
  try {
    const isEnabled =
      typeof testModeUtils.isTestModeEnabled === "function"
        ? testModeUtils.isTestModeEnabled()
        : false;
    cooldownSeconds = isEnabled ? 0 : Math.max(0, Math.round(overrideMs / 1000));
  } catch {
    cooldownSeconds = Math.max(0, Math.round(overrideMs / 1000));
  }
  try {
    if (isTestModeEnabled())
      console.warn(`[test] scheduleNextRound: testMode=true cooldown=${cooldownSeconds}`);
    else console.warn(`[test] scheduleNextRound: testMode=false cooldown=${cooldownSeconds}`);
  } catch {}

  if (btn) {
    btn.disabled = false;
    delete btn.dataset.nextReady;
  }

  const onTick = (remaining) => {
    if (remaining <= 0) {
      const text = "Next round in: 0s";
      if (!snackbarStarted) {
        snackbar.showSnackbar(text);
        snackbarStarted = true;
      } else {
        snackbar.updateSnackbar(text);
      }
      scoreboard.clearTimer();
      return;
    }
    if (remaining === lastRenderedRemaining) return;
    const text = `Next round in: ${remaining}s`;
    if (!snackbarStarted) {
      snackbar.showSnackbar(text);
      snackbarStarted = true;
    } else {
      snackbar.updateSnackbar(text);
    }
    lastRenderedRemaining = remaining;
  };

  const onExpired = async () => {
    setSkipHandler(null);
    scoreboard.clearTimer();
    if (timerEl) {
      timerEl.textContent = "";
    }
    if (btn) {
      btn.dataset.nextReady = "true";
      btn.disabled = false;
    }
    await dispatchBattleEvent("ready");
    updateDebugPanel();
    if (typeof controls.resolveReady === "function") {
      controls.resolveReady();
    }
  };

  // Fast-path: zero-second cooldown (e.g., test mode). Ensure the Next button
  // appears enabled and ready, surface a deterministic snackbar message, and
  // resolve promptly without starting a timer.
  if (cooldownSeconds === 0) {
    // Maintain UX/test determinism: even with a 0s cooldown, show a
    // countdown snackbar so observers (and tests) see a stable message
    // instead of the previous round outcome lingering in the snackbar.
    try {
      snackbar.showSnackbar("Next round in: 0s");
    } catch {}
    if (btn) {
      btn.dataset.nextReady = "true";
      btn.disabled = false;
    }
    // Signal that the next-round control is ready but do not auto-advance;
    // tests may click Next or call the page-level skip helper.
    setSkipHandler(async () => {
      try {
        if (btn) btn.disabled = true;
        await dispatchBattleEvent("ready");
        updateDebugPanel();
      } catch {}
    });
    try {
      emitBattleEvent("nextRoundTimerReady");
    } catch {}
    if (typeof controls.resolveReady === "function") {
      try {
        controls.resolveReady();
      } catch {}
    }
    currentNextRound = controls;
    return controls;
  }

  controls.timer = createRoundTimer(onTick, onExpired);
  setSkipHandler(() => {
    try {
      console.warn("[test] skip: stop nextRoundTimer");
    } catch {}
    if (controls.timer) controls.timer.stop();
  });

  if (btn && btn.dataset.nextReady === "true") {
    controls.resolveReady();
    currentNextRound = controls;
    return controls;
  }

  onTick(cooldownSeconds);
  scheduler.setTimeout(() => controls.timer.start(cooldownSeconds), 0);
  currentNextRound = controls;
  return controls;
}
