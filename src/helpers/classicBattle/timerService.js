import { getDefaultTimer } from "../timerUtils.js";
import { startRound as engineStartRound, startCoolDown, stopTimer } from "../battleEngineFacade.js";
import * as scoreboard from "../setupScoreboard.js";
import { updateDebugPanel } from "./uiHelpers.js";
import { showSnackbar, updateSnackbar } from "../showSnackbar.js";
import { setSkipHandler, skipCurrentPhase } from "./skipHandler.js";
import { autoSelectStat } from "./autoSelectStat.js";
import { dispatchBattleEvent } from "./orchestrator.js";
import { isEnabled } from "../featureFlags.js";

// Skip handler utilities moved to skipHandler.js

export async function onNextButtonClick() {
  const btn = document.getElementById("next-button");
  if (!btn) return;

  // If the next round is ready, start it immediately.
  if (btn.dataset.nextReady === "true") {
    btn.disabled = true;
    delete btn.dataset.nextReady;
    await dispatchBattleEvent("ready");
    setSkipHandler(null);
    return;
  }

  // Otherwise, request skipping the current cooldown phase.
  // If no skip handler is active yet, this marks the skip as pending and
  // it will trigger as soon as the handler is registered.
  skipCurrentPhase();

  // If skipping completed synchronously and the next round became ready,
  // start it right away. Otherwise, observe the button until it becomes ready
  // and then start automatically (covers early clicks before cooldown begins).
  const maybeStart = async () => {
    if (btn.dataset.nextReady === "true") {
      btn.disabled = true;
      delete btn.dataset.nextReady;
      await dispatchBattleEvent("ready");
      setSkipHandler(null);
      return true;
    }
    return false;
  };

  if (await maybeStart()) return;

  const obs = new MutationObserver(async () => {
    if (await maybeStart()) {
      obs.disconnect();
    }
  });
  obs.observe(btn, { attributes: true, attributeFilter: ["data-next-ready", "disabled"] });

  if (await maybeStart()) {
    obs.disconnect();
    return;
  }

  // Safety timeout to avoid leaking the observer if nothing happens.
  setTimeout(() => obs.disconnect(), 10000);
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
 * Start the round timer and, on expiration, either auto-select a random stat
 * or interrupt the round based on Random Stat Mode.
 *
 * @pseudocode
 * 1. Determine timer duration using `getDefaultTimer('roundTimer')`.
 *    - On error, temporarily show "Waiting…" and fallback to 30 seconds.
 * 2. Start the timer via `engineStartRound` and monitor for drift.
 *    - On drift trigger auto-select logic and dispatch the outcome event.
 * 3. Register a skip handler that stops the timer and triggers `onExpired`.
 * 4. When expired, dispatch `"timeout"` and then:
 *    a. If `isEnabled('randomStatMode')`, call `autoSelectStat` to pick a stat
 *       and invoke `onExpiredSelect` with `delayOpponentMessage`.
 *    b. Otherwise dispatch `"interrupt"` to follow the interruption path.
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
    if (isEnabled("randomStatMode")) {
      await autoSelectStat(onExpiredSelect);
    } else {
      await dispatchBattleEvent("interrupt");
    }
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

  const MAX_DRIFT_RETRIES = 3;
  let retries = 0;

  function start(dur) {
    // Fire-and-forget: starting the engine timer should not block callers
    // (especially tests running with mocked schedulers).
    engineStartRound(onTick, onExpired, dur, handleDrift);
  }

  async function handleDrift(remaining) {
    retries += 1;
    if (retries > MAX_DRIFT_RETRIES) {
      await forceAutoSelectAndDispatch(onExpiredSelect);
      return;
    }
    scoreboard.showMessage("Waiting…");
    await start(remaining);
  }

  setSkipHandler(async () => {
    stopTimer();
    await onExpired();
  });

  start(duration);
  restore();
}

/**
 * Handle stalled stat selection by prompting the player and auto-selecting a
 * random stat.
 *
 * @pseudocode
 * 1. Display "Stat selection stalled" via `scoreboard.showMessage`.
 * 2. After 5 seconds call `autoSelectStat(onSelect)`.
 *
 * @param {{autoSelectId: ReturnType<typeof setTimeout> | null}} store
 * - Battle state store.
 * @param {(stat: string, opts?: { delayOpponentMessage?: boolean }) => void} onSelect
 * - Callback to handle stat selection.
 */
export function handleStatSelectionTimeout(store, onSelect) {
  scoreboard.showMessage("Stat selection stalled. Pick a stat or wait for auto-pick.");
  store.autoSelectId = setTimeout(() => {
    autoSelectStat(onSelect);
  }, 5000);
}

/**
 * Enable the Next Round button after a cooldown period.
 *
 * @pseudocode
 * 1. If the match ended, return early.
 * 2. Locate `#next-button` and `#next-round-timer`; exit if the button is missing.
 * 3. After a short delay, run a 3 second cooldown via `startCoolDown`
 *    and display `"Next round in: <n>s"` using one snackbar that updates each tick.
 * 4. Register a skip handler that stops the timer and invokes the expiration logic.
 * 5. When expired, clear the `#next-round-timer` element, set `data-next-ready="true"`,
 *    enable the Next Round button, dispatch `"ready"` to auto-advance the state machine,
 *    and clear the handler.
 *
 * @param {{matchEnded: boolean}} result - Result from a completed round.
 */
export function scheduleNextRound(result) {
  if (result.matchEnded) {
    setSkipHandler(null);
    return;
  }

  const btn = document.getElementById("next-button");
  if (!btn) return;
  const timerEl = document.getElementById("next-round-timer");

  // Track snackbar lifecycle and whether the cooldown actually started.
  let snackbarStarted = false;
  // Track last rendered remaining to avoid duplicate updates when we
  // pre-render the initial state and the timer immediately echoes the
  // same remaining value on its first tick.
  let lastRenderedRemaining = -1;

  // Make the Next button act as a skip control during cooldown: keep it enabled
  // but mark it as not-ready until the cooldown expires. The click handler will
  // request a skip when not ready.
  btn.disabled = false;
  delete btn.dataset.nextReady;

  const onTick = (remaining) => {
    if (remaining <= 0) {
      scoreboard.clearTimer();
      return;
    }
    if (remaining === lastRenderedRemaining) return;
    const text = `Next round in: ${remaining}s`;
    if (!snackbarStarted) {
      showSnackbar(text);
      snackbarStarted = true;
    } else {
      updateSnackbar(text);
    }
    lastRenderedRemaining = remaining;
  };

  const onExpired = async () => {
    setSkipHandler(null);
    scoreboard.clearTimer();
    if (timerEl) {
      timerEl.textContent = "";
    }
    btn.dataset.nextReady = "true";
    btn.disabled = false;
    await dispatchBattleEvent("ready");
    updateDebugPanel();
  };

  const MAX_DRIFT_RETRIES = 3;
  let retries = 0;

  function start(dur) {
    startCoolDown(onTick, onExpired, dur, handleDrift);
  }

  function handleDrift(remaining) {
    retries += 1;
    if (retries > MAX_DRIFT_RETRIES) {
      scoreboard.showMessage("Timer error. Enabling next round.");
      onExpired();
      return;
    }
    scoreboard.showMessage("Waiting…");
    start(remaining);
  }

  // Allow immediate skipping, even before cooldown starts. If the cooldown
  // hasn't begun yet, simply stop and expire.
  setSkipHandler(() => {
    stopTimer();
    onExpired();
  });

  if (btn.dataset.nextReady === "true") {
    return;
  }

  // Ensure the initial cooldown message is visible immediately, even if
  // the underlying timer is paused or a skip is pending. The timer will
  // update/replace this text on the first scheduled tick.
  onTick(3);
  // Defer starting the underlying timer to the next task to avoid racing the
  // initial snackbar render in tests and slow environments.
  setTimeout(() => start(3), 0);
}
