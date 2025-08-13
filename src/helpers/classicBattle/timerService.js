import { getDefaultTimer } from "../timerUtils.js";
import { startRound as engineStartRound, startCoolDown, stopTimer } from "../battleEngineFacade.js";
import * as infoBar from "../setupBattleInfoBar.js";
import { updateDebugPanel } from "./uiHelpers.js";
import { runTimerWithDrift } from "./runTimerWithDrift.js";
import { showSnackbar, updateSnackbar } from "../showSnackbar.js";
import { setSkipHandler, skipCurrentPhase } from "./skipHandler.js";
import { autoSelectStat } from "./autoSelectStat.js";

// Skip handler utilities moved to skipHandler.js

export async function onNextButtonClick() {
  const btn = document.getElementById("next-button");
  if (!btn) return;

  // If the next round is ready, start it immediately.
  if (btn.dataset.nextReady === "true") {
    btn.disabled = true;
    delete btn.dataset.nextReady;
    try {
      const { dispatchBattleEvent } = await import("./orchestrator.js");
      await dispatchBattleEvent("ready");
    } catch {}
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
      try {
        const { dispatchBattleEvent } = await import("./orchestrator.js");
        await dispatchBattleEvent("ready");
      } catch {}
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

  // Safety timeout to avoid leaking the observer if nothing happens.
  setTimeout(() => obs.disconnect(), 10000);
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
 * 4. When expired, delegate stat auto-selection to `autoSelectStat`, which
 *    highlights the chosen stat, shows UI feedback, invokes `onExpiredSelect`
 *    with `delayOpponentMessage`, and clears the handler.
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
      infoBar.clearTimer();
      return;
    }
    timerEl.textContent = `Time Left: ${remaining}s`;
  };

  const onExpired = async () => {
    setSkipHandler(null);
    infoBar.clearTimer();
    try {
      const { dispatchBattleEvent } = await import("./orchestrator.js");
      await dispatchBattleEvent("timeout");
    } catch {}
    await autoSelectStat(onExpiredSelect);
  };

  // Register skip handler immediately so early calls to `skipBattlePhase` take effect
  setSkipHandler(async () => {
    stopTimer();
    await onExpired();
  });

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
 * 2. After 5 seconds call `autoSelectStat(onSelect)`.
 *
 * @param {{autoSelectId: ReturnType<typeof setTimeout> | null}} store
 * - Battle state store.
 * @param {(stat: string, opts?: { delayOpponentMessage?: boolean }) => void} onSelect
 * - Callback to handle stat selection.
 */
export function handleStatSelectionTimeout(store, onSelect) {
  infoBar.showMessage("Stat selection stalled. Pick a stat or wait for auto-pick.");
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
 * 3. After a short delay, run a 3 second cooldown via `runTimerWithDrift(startCoolDown)`
 *    and display `"Next round in: <n>s"` using one snackbar that updates each tick.
 * 4. Register a skip handler that stops the timer and invokes the expiration logic.
 * 5. When expired, clear the `#next-round-timer` element, set `data-next-ready="true"`,
 *    enable the Next Round button, and clear the handler.
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

  // Make the Next button act as a skip control during cooldown: keep it enabled
  // but mark it as not-ready until the cooldown expires. The click handler will
  // request a skip when not ready.
  btn.disabled = false;
  delete btn.dataset.nextReady;

  const onTick = (remaining) => {
    if (remaining <= 0) {
      infoBar.clearTimer();
      return;
    }
    const text = `Next round in: ${remaining}s`;
    if (!snackbarStarted) {
      showSnackbar(text);
      snackbarStarted = true;
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
    btn.dataset.nextReady = "true";
    btn.disabled = false;
    updateDebugPanel();
  };

  // Allow immediate skipping, even before cooldown starts. If the cooldown
  // hasn't begun yet, simply stop and expire.
  setSkipHandler(() => {
    stopTimer();
    onExpired();
  });

  if (btn.dataset.nextReady === "true") {
    return;
  }

  const run = runTimerWithDrift(startCoolDown);
  run(3, onTick, onExpired, () => {
    infoBar.showMessage("Timer error. Enabling next round.");
    onExpired();
  });
}
