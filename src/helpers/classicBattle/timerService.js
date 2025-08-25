import { getDefaultTimer } from "../timerUtils.js";
import { startRound as engineStartRound, startCoolDown, stopTimer } from "../battleEngineFacade.js";
import * as scoreboard from "../setupScoreboard.js";
import { updateDebugPanel } from "./uiHelpers.js";
import * as snackbar from "../showSnackbar.js";
import { setSkipHandler } from "./skipHandler.js";
import { autoSelectStat } from "./autoSelectStat.js";
import { emitBattleEvent } from "./battleEvents.js";
import { realScheduler } from "../scheduler.js";
import { isTestModeEnabled } from "../testModeUtils.js";
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
 * Determine the cooldown duration before the next round.
 *
 * @pseudocode
 * 1. Read `window.__NEXT_ROUND_COOLDOWN_MS` or default to 3000ms.
 * 2. If test mode is enabled via `utils.isTestModeEnabled()`, force cooldown to 0.
 * 3. Otherwise convert to whole seconds and clamp to \>=0.
 * 4. Log test mode state and resolved cooldown; wrap each warn in try.
 *
 * @param {{isTestModeEnabled: () => boolean}} [utils] - Test mode utilities (for injection).
 * @returns {number} Cooldown in seconds.
 */
export function computeNextRoundCooldown(utils = { isTestModeEnabled }) {
  const overrideMs =
    typeof window !== "undefined" && typeof window.__NEXT_ROUND_COOLDOWN_MS === "number"
      ? window.__NEXT_ROUND_COOLDOWN_MS
      : 3000;
  let cooldownSeconds;
  try {
    const enabled =
      typeof utils.isTestModeEnabled === "function" ? utils.isTestModeEnabled() : false;
    cooldownSeconds = enabled ? 0 : Math.max(0, Math.round(overrideMs / 1000));
  } catch {
    cooldownSeconds = Math.max(0, Math.round(overrideMs / 1000));
  }
  if (isTestModeEnabled()) {
    try {
      console.warn(`[test] scheduleNextRound: testMode=true cooldown=${cooldownSeconds}`);
    } catch {}
  } else {
    try {
      console.warn(`[test] scheduleNextRound: testMode=false cooldown=${cooldownSeconds}`);
    } catch {}
  }
  return cooldownSeconds;
}

/**
 * Create a tick handler that renders the next-round countdown via snackbar.
 *
 * @pseudocode
 * 1. Track whether the snackbar was shown and last rendered value.
 * 2. When remaining \<=0, show "Next round in: 0s" and clear the scoreboard timer.
 * 3. Skip rendering if the remaining value hasn't changed.
 * 4. Otherwise show or update the snackbar with the new remaining seconds.
 *
 * @returns {(remaining: number) => void} Tick handler for the countdown.
 */
export function createNextRoundSnackbarRenderer() {
  let started = false;
  let lastRendered = -1;
  return (remaining) => {
    if (remaining <= 0) {
      const text = "Next round in: 0s";
      if (!started) {
        snackbar.showSnackbar(text);
        started = true;
      } else {
        snackbar.updateSnackbar(text);
      }
      scoreboard.clearTimer();
      return;
    }
    if (remaining === lastRendered) return;
    const text = `Next round in: ${remaining}s`;
    if (!started) {
      snackbar.showSnackbar(text);
      started = true;
    } else {
      snackbar.updateSnackbar(text);
    }
    lastRendered = remaining;
  };
}

/**
 * Handle zero-second cooldown by enabling the Next button immediately.
 *
 * @pseudocode
 * 1. Show a deterministic "Next round in: 0s" snackbar.
 * 2. Mark the Next button as ready and ensure it is enabled.
 * 3. Register a skip handler that dispatches "ready" when invoked.
 * 4. Emit "nextRoundTimerReady" and resolve the ready promise.
 *
 * @param {{resolveReady: (() => void) | null}} controls - Timer controls.
 * @param {HTMLButtonElement | null} btn - Next button element.
 * @returns {{resolveReady: (() => void) | null, ready: Promise<void>, timer: ReturnType<typeof createRoundTimer> | null}} Controls.
 */
export function handleZeroCooldownFastPath(controls, btn) {
  try {
    snackbar.showSnackbar("Next round in: 0s");
  } catch {}
  if (btn) {
    btn.dataset.nextReady = "true";
    btn.disabled = false;
  }
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

/**
 * Handle expiration of the next-round cooldown.
 *
 * @pseudocode
 * 1. Clear the skip handler and scoreboard timer.
 * 2. Remove any countdown text from the timer element.
 * 3. Enable the Next button and mark it as ready.
 * 4. Dispatch "ready", update the debug panel, and resolve the ready promise.
 *
 * @param {{resolveReady: (() => void) | null}} controls - Timer controls.
 * @param {HTMLButtonElement | null} btn - Next button element.
 * @param {HTMLElement | null} timerEl - Countdown display element.
 * @returns {Promise<void>}
 */
export async function handleNextRoundExpiration(controls, btn, timerEl) {
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
}

/**
 * Enable the Next Round button after a cooldown period.
 *
 * @pseudocode
 * 1. If the match ended, resolve immediately.
 * 2. Determine cooldown seconds via `computeNextRoundCooldown`.
 * 3. Locate `#next-button` and `#next-round-timer` and enable the button.
 * 4. If cooldown is zero, delegate to `handleZeroCooldownFastPath`.
 * 5. Otherwise create `onTick` with `createNextRoundSnackbarRenderer` and
 *    `onExpired` with `handleNextRoundExpiration`.
 * 6. Register a skip handler that logs the skip (for tests) and stops the timer.
 * 7. Start the timer and resolve when expired.
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

  const cooldownSeconds = computeNextRoundCooldown();

  if (btn) {
    btn.disabled = false;
    delete btn.dataset.nextReady;
  }

  if (cooldownSeconds === 0) {
    return handleZeroCooldownFastPath(controls, btn);
  }

  const onTick = createNextRoundSnackbarRenderer();
  const onExpired = () => handleNextRoundExpiration(controls, btn, timerEl);

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
