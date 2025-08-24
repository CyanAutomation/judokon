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

let nextRoundTimer = null;
let nextRoundReadyResolve = null;

// Skip handler utilities moved to skipHandler.js

// Local dispatcher that prefers calling the orchestrator export (so tests can spy),
// and falls back to dispatching directly on the running machine when available.
async function dispatchBattleEventLocal(eventName, payload) {
  // Prefer orchestrator export when it can be loaded (satisfies test spies)
  try {
    const orchestrator = await import("./orchestrator.js");
    if (orchestrator && typeof orchestrator.dispatchBattleEvent === "function") {
      if (payload === undefined) return await orchestrator.dispatchBattleEvent(eventName);
      return await orchestrator.dispatchBattleEvent(eventName, payload);
    }
  } catch {}
  // Fallback to the live machine when present
  try {
    if (typeof window !== "undefined") {
      const getMachine = window.__getClassicBattleMachine;
      const machine = typeof getMachine === "function" ? getMachine() : null;
      if (machine && typeof machine.dispatch === "function") {
        return await machine.dispatch(eventName, payload);
      }
    }
  } catch {}
}

export async function onNextButtonClick() {
  const btn = document.getElementById("next-button");
  if (!btn) return;

  if (btn.dataset.nextReady === "true") {
    btn.disabled = true;
    delete btn.dataset.nextReady;
    await dispatchBattleEventLocal("ready");
    if (typeof nextRoundReadyResolve === "function") {
      nextRoundReadyResolve();
      nextRoundReadyResolve = null;
    }
    setSkipHandler(null);
    return;
  }

  if (nextRoundTimer) {
    nextRoundTimer.stop();
  }
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
    await dispatchBattleEventLocal("interrupt");
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
    await dispatchBattleEventLocal("timeout");
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

export function createRoundTimer(onTick, onExpired) {
  const MAX_DRIFT_RETRIES = 3;
  let retries = 0;

  function start(dur) {
    startCoolDown(onTick, onExpiredInternal, dur, handleDrift);
  }

  async function onExpiredInternal() {
    await onExpired();
  }

  function handleDrift(remaining) {
    retries += 1;
    if (retries > MAX_DRIFT_RETRIES) {
      onExpiredInternal();
      return;
    }
    const msgEl = document.getElementById("round-message");
    if (msgEl && msgEl.textContent) {
      snackbar.showSnackbar("Waiting…");
    } else {
      scoreboard.showMessage("Waiting…");
    }
    start(remaining);
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
 * @returns {Promise<void>} Resolves after dispatching "ready".
 */
export function scheduleNextRound(result, scheduler = realScheduler) {
  return new Promise((resolve) => {
    if (result.matchEnded) {
      setSkipHandler(null);
      emitBattleEvent("nextRoundTimerReady");
      resolve();
      return;
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
      const isEnabled = typeof testModeUtils.isTestModeEnabled === "function"
        ? testModeUtils.isTestModeEnabled()
        : false;
      cooldownSeconds = isEnabled ? 0 : Math.max(0, Math.round(overrideMs / 1000));
    } catch {
      cooldownSeconds = Math.max(0, Math.round(overrideMs / 1000));
    }
    try {
      if (isTestModeEnabled()) console.warn(`[test] scheduleNextRound: testMode=true cooldown=${cooldownSeconds}`);
      else console.warn(`[test] scheduleNextRound: testMode=false cooldown=${cooldownSeconds}`);
    } catch {}

    nextRoundReadyResolve = () => {
      emitBattleEvent("nextRoundTimerReady");
      resolve();
      nextRoundReadyResolve = null;
    };

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
      await dispatchBattleEventLocal("ready");
      updateDebugPanel();
      if (typeof nextRoundReadyResolve === "function") {
        nextRoundReadyResolve();
      }
    };

    // Fast-path: zero-second cooldown (e.g., test mode). Ensure the Next button
    // appears enabled and ready, dispatch the transition, and resolve promptly
    // without starting a timer.
    if (cooldownSeconds === 0) {
      if (btn) {
        btn.dataset.nextReady = "true";
        btn.disabled = false;
      }
      // Signal that the next-round control is ready but do not auto-advance;
      // tests may click Next or call the page-level skip helper.
      setSkipHandler(async () => {
        try {
          if (btn) btn.disabled = true;
          await dispatchBattleEventLocal("ready");
          updateDebugPanel();
        } catch {}
      });
      try {
        emitBattleEvent("nextRoundTimerReady");
      } catch {}
      if (typeof nextRoundReadyResolve === "function") {
        try { nextRoundReadyResolve(); } catch {}
        nextRoundReadyResolve = null;
      }
      return;
    }

    nextRoundTimer = createRoundTimer(onTick, onExpired);
    setSkipHandler(() => {
      try { console.warn("[test] skip: stop nextRoundTimer"); } catch {}
      nextRoundTimer.stop();
    });

    if (btn && btn.dataset.nextReady === "true") {
      nextRoundReadyResolve();
      return;
    }

    onTick(cooldownSeconds);
    scheduler.setTimeout(() => nextRoundTimer.start(cooldownSeconds), 0);
  });
}
