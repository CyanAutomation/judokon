import { getDefaultTimer } from "../timerUtils.js";
import { getNextRoundControls, setupFallbackTimer } from "./roundManager.js";
import { isTestModeEnabled } from "../testModeUtils.js";
import { getOpponentJudoka } from "./cardSelection.js";
import { getStatValue } from "../battle/index.js";
import { emitBattleEvent, onBattleEvent, offBattleEvent } from "./battleEvents.js";
import { resolveRound } from "./roundResolver.js";
import { guard, guardAsync, scheduleGuard } from "./guard.js";
import { exposeDebugState, readDebugState } from "./debugHooks.js";
import { debugLog } from "../debug.js";
// Removed unused import for enableNextRoundButton

/**
 * Whether the orchestrator should automatically dispatch "continue" after an
 * outcome. Consumers like the CLI can toggle this for readability.
 * @type {boolean}
 */
export let autoContinue = true;

/**
 * Update the `autoContinue` behavior.
 * @param {boolean} val
 */
export function setAutoContinue(val) {
  autoContinue = val !== false;
}

/**
 * Handle round-related errors in a consistent manner.
 *
 * @param {object} machine
 * @param {string} reason
 * @param {Error} err
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Show a generic round error message on the scoreboard.
 * 2. Update the debug panel for visibility.
 * 3. Dispatch an interrupt with the reason and `err.message`.
 */
export async function handleRoundError(machine, reason, err) {
  guard(() => emitBattleEvent("scoreboardShowMessage", "Round error. Recovering…"));
  guard(() => emitBattleEvent("debugPanelUpdate"));
  await guardAsync(() => machine.dispatch("interrupt", { reason, error: err?.message }));
}

/**
 * Determine whether the machine transitioned from `from` to `to`.
 *
 * @pseudocode
 * 1. Read current and previous state from `document.body.dataset`.
 * 2. If `from` is null/undefined, compare only current → `to`.
 * 3. Otherwise, return whether previous equals `from` and current equals `to`.
 * 4. Return false on any error.
 *
 * @param {string|null|undefined} from
 * @param {string} to
 * @returns {boolean}
 */
export function isStateTransition(from, to) {
  try {
    if (typeof document === "undefined") return false;
    const current = document.body?.dataset.battleState;
    const prev = document.body?.dataset.prevBattleState;
    if (from === null || from === undefined) {
      return current === to;
    }
    return prev === from && current === to;
  } catch {
    return false;
  }
}

/**
 * Initialize the match start cooldown timer.
 *
 * @pseudocode
 * 1. Resolve match start duration with 3s default.
 * 2. Emit `countdownStart` and listen for `countdownFinished`.
 * 3. Schedule fallback timer to dispatch `ready` if no event fires.
 */
export async function initStartCooldown(machine) {
  let duration = 3;
  try {
    const val = await getDefaultTimer("matchStartTimer");
    if (typeof val === "number") duration = val;
  } catch {}
  duration = Math.max(1, Number(duration));
  let fallback = null;
  const onFinished = () => {
    try {
      offBattleEvent("countdownFinished", onFinished);
    } catch {}
    try {
      if (fallback) clearTimeout(fallback);
    } catch {}
    try {
      // PRD control event: countdown completed
      emitBattleEvent("control.countdown.completed");
    } catch {}
    try {
      machine.dispatch("ready");
    } catch {}
  };
  onBattleEvent("countdownFinished", onFinished);
  emitBattleEvent("countdownStart", { duration });
  // PRD control event: countdown started
  try {
    emitBattleEvent("control.countdown.started", {
      durationMs: Math.max(0, Number(duration) || 0) * 1000
    });
  } catch {}
  // In test mode, auto-advance without relying on timers which are often faked.
  try {
    if (isTestModeEnabled && isTestModeEnabled()) {
      if (typeof queueMicrotask === "function") queueMicrotask(onFinished);
      else setTimeout(onFinished, 0);
      return;
    }
  } catch {}
  try {
    // Prefer the roundManager helper when available; fall back to setTimeout.
    const schedule = typeof setupFallbackTimer === "function" ? setupFallbackTimer : setTimeout;
    fallback = schedule(duration * 1000 + 200, onFinished);
  } catch {
    // Last resort: attempt a direct transition
    onFinished();
  }
}

/**
 * Initialize the inter-round cooldown timer.
 *
 * This function is now the sole owner of the inter-round cooldown logic when
 * the orchestrator is active. It starts a countdown, and when it finishes,
 * it marks the "Next" button as ready.
 *
 * @param {object} machine The state machine instance.
 * @pseudocode
 * 1. Get the cooldown duration from `computeNextRoundCooldown`.
 * 2. Emit the `countdownStart` event with the duration.
 * 3. Enable the "Next" button (`disabled = false`, `data-next-ready = "true"`).
 * 4. Schedule a zero-delay task to re-query `#next-button` and reapply readiness.
 * 5. Emit the `nextRoundTimerReady` event.
 * 6. Start a timer; on expiry, mark the button ready, emit cooldown events, and dispatch "ready".
 * 7. Schedule a fallback timer to ensure readiness if the main timer fails.
 */
export async function initInterRoundCooldown(machine) {
  const { computeNextRoundCooldown } = await import("../timers/computeNextRoundCooldown.js");
  const { createRoundTimer } = await import("../timers/createRoundTimer.js");
  const { startCoolDown: engineStartCoolDown } = await import("../battleEngineFacade.js");
  const duration = computeNextRoundCooldown();

  // Notify UI layers that a countdown is starting.
  try {
    emitBattleEvent("countdownStart", { duration });
  } catch (err) {
    debugLog("Failed to emit countdownStart event:", err);
  }
  // PRD control event: countdown started
  try {
    emitBattleEvent("control.countdown.started", {
      durationMs: Math.max(0, Number(duration) || 0) * 1000
    });
  } catch {}

  // Enable the Next button during cooldown so users can skip immediately
  // and mark readiness now.
  try {
    const nextButton =
      document.getElementById("next-button") || document.querySelector('[data-role="next-round"]');
    /**
     * Mark the Next button as ready for advancement.
     * @param {HTMLElement} btn
     */
    const markReady = (btn) => {
      btn.disabled = false;
      btn.dataset.nextReady = "true";
    };
    if (nextButton) {
      markReady(nextButton);
      setTimeout(() => {
        const btn = document.getElementById("next-button");
        if (btn && btn.dataset.nextReady !== "true" && machine?.getState?.() === "cooldown") {
          markReady(btn);
        }
      }, 0);
    }
  } catch {}

  try {
    emitBattleEvent("nextRoundTimerReady");
  } catch {}

  // Orchestrator-owned cooldown timer; on expiry, mark Next ready and advance.
  const timer = createRoundTimer({ starter: engineStartCoolDown });
  timer.on("expired", () => {
    try {
      const nextButton = document.getElementById("next-button");
      if (nextButton) nextButton.dataset.nextReady = "true";
    } catch {}
    try {
      emitBattleEvent("cooldown.timer.expired");
      emitBattleEvent("nextRoundTimerReady");
      emitBattleEvent("countdownFinished");
      // PRD control event: countdown completed
      emitBattleEvent("control.countdown.completed");
    } catch {}
    try {
      machine.dispatch("ready");
    } catch {}
  });
  timer.on("tick", (remaining) => {
    try {
      emitBattleEvent("cooldown.timer.tick", {
        remainingMs: Math.max(0, Number(remaining) || 0) * 1000
      });
    } catch {}
  });
  timer.start(duration);
  // Fallback: ensure readiness even if the engine timer is mocked or fails
  try {
    const { setupFallbackTimer } = await import("./roundManager.js");
    setupFallbackTimer(Math.max(0, Number(duration) || 0) * 1000 + 200, () => {
      try {
        const btn = document.getElementById("next-button");
        if (btn) btn.dataset.nextReady = "true";
      } catch {}
      try {
        emitBattleEvent("nextRoundTimerReady");
        emitBattleEvent("countdownFinished");
      } catch {}
      try {
        machine.dispatch("ready");
      } catch {}
    });
  } catch {}
}

/**
 * onEnter handler for `waitingForMatchStart` state.
 *
 * @pseudocode
 * 1. If this is a no-op transition, return early.
 * 2. Call `doResetGame` from machine context when available.
 * 3. Emit events to clear the scoreboard and refresh debug panel.
 *
 * @param {object} machine
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * onEnter handler for `waitingForMatchStart`.
 *
 * @pseudocode
 * 1. No-op if the machine re-entered the same state.
 * 2. Call `doResetGame` from machine.context when available.
 * 3. Emit UI events to clear messages and update debug panels.
 * 4. Import and call scoreboard/UI helpers to ensure they are initialized.
 *
 * @param {object} machine
 */
export async function waitingForMatchStartEnter(machine) {
  if (isStateTransition("waitingForMatchStart", "waitingForMatchStart")) return;
  const { doResetGame } = machine.context;
  if (typeof doResetGame === "function") doResetGame();
  emitBattleEvent("scoreboardClearMessage");
  emitBattleEvent("debugPanelUpdate");
  // Also directly invoke UI side-effects to guarantee initialization in tests/runtime
  try {
    const scoreboard = await import("../setupScoreboard.js");
    scoreboard.clearMessage?.();
  } catch {}
  try {
    const helpers = await import("./uiHelpers.js");
    helpers.updateDebugPanel?.();
  } catch {}
}

/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * onEnter handler for `matchStart` state.
 *
 * @pseudocode
 * 1. Dispatch `ready` immediately to proceed with initial match flow.
 *
 * @param {object} machine
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export async function matchStartEnter(machine) {
  await machine.dispatch("ready", { initial: true });
}

/**
 * onEnter handler for `cooldown` state.
 *
 * @pseudocode
 * 1. If `payload.initial`, delegate to `initStartCooldown`.
 * 2. Otherwise, ensure an inter-round cooldown is scheduled via roundManager when none exists.
 *
 * @param {object} machine
 * @param {object} [payload]
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. If initial cooldown requested → `initStartCooldown`.
 * 2. Else → schedule `roundManager.startCooldown` if not already scheduled.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * onEnter handler for `cooldown` state.
 *
 * @pseudocode
 * 1. If `payload.initial` -> initialize start cooldown.
 * 2. Otherwise ensure inter-round cooldown is scheduled when absent.
 *
 * @param {object} machine
 * @param {object} [payload]
 */
export async function cooldownEnter(machine, payload) {
  if (payload?.initial) {
    return initStartCooldown(machine);
  }
  // The orchestrator now owns the inter-round cooldown.
  return initInterRoundCooldown(machine);
}

/**
 * onEnter handler for `roundStart` state.
 *
 * @pseudocode
 * 1. Start the round via `startRoundWrapper` or `doStartRound` asynchronously.
 * 2. Install a short fallback in test/headless mode to advance to `cardsRevealed` to avoid stalls.
 * 3. If rendering fails, emit an error message and dispatch `interrupt`.
 * 4. If still in `roundStart`, dispatch `cardsRevealed` to proceed.
 *
 * @param {object} machine
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Install a short timer that advances past `roundStart` in test environments.
 *
 * @param {object} machine
 * @returns {ReturnType<typeof setTimeout>|null}
 */
function installRoundStartFallback(machine) {
  if (!isTestModeEnabled || !isTestModeEnabled()) return null;
  return setupFallbackTimer(50, () => {
    guardAsync(async () => {
      const state = machine.getState ? machine.getState() : null;
      if (state === "roundStart") await machine.dispatch("cardsRevealed");
    });
  });
}

/**
 * Invoke the round start routine from the provided context.
 *
 * @param {{startRoundWrapper?: Function, doStartRound?: Function, store?: any}} ctx
 * @returns {any}
 */
function invokeRoundStart(ctx) {
  const { startRoundWrapper, doStartRound, store } = ctx;
  if (typeof startRoundWrapper === "function") return startRoundWrapper();
  if (typeof doStartRound === "function") return doStartRound(store);
  return Promise.resolve();
}

/**
 * onEnter handler for `roundStart` state.
 *
 * @pseudocode
 * 1. Install a short fallback in test mode to advance if UI stalls.
 * 2. Invoke the round start routine from the machine context.
 * 3. On failure → clear fallback and handleRoundError(`roundStartError`).
 * 4. If start succeeds and state still `roundStart` → dispatch `cardsRevealed`.
 *
 * @param {object} machine
 */
export async function roundStartEnter(machine) {
  const fallback = installRoundStartFallback(machine);
  try {
    await Promise.resolve(invokeRoundStart(machine.context));
    guard(() => {
      if (fallback) clearTimeout(fallback);
    });
    await guardAsync(async () => {
      const state = machine.getState ? machine.getState() : null;
      if (state === "roundStart") await machine.dispatch("cardsRevealed");
    });
  } catch (err) {
    guard(() => {
      if (fallback) clearTimeout(fallback);
    });
    await handleRoundError(machine, "roundStartError", err);
  }
}

/**
 * onEnter handler for `waitingForPlayerAction` state.
 *
 * @pseudocode
 * 1. Enable stat buttons via battle events.
 * 2. If a selection already exists on the store, dispatch `statSelected` immediately.
 *
 * @param {object} machine
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export async function waitingForPlayerActionEnter(machine) {
  emitBattleEvent("statButtons:enable");
  // Do NOT mark the Next button as ready here. The Next button is reserved
  // for advancing after cooldown between rounds. Enabling it during stat
  // selection can cause the cooldown scheduler to short-circuit, skipping the
  // timer and preventing the state machine from progressing — seen as a "hang"
  // on the classic battle page. The CLI page never enables Next during
  // selection and does not suffer this issue. Keep Next controlled by the
  // cooldown scheduler only.
  const store = machine?.context?.store;
  if (store?.playerChoice) {
    await machine.dispatch("statSelected");
  }
}
/**
 * onExit handler for `waitingForPlayerAction` state.
 *
 * @pseudocode
 * 1. Emit an event to disable stat buttons.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export async function waitingForPlayerActionExit() {
  emitBattleEvent("statButtons:disable");
}

/**
 * Record that the machine entered `roundDecision` for debug tracing.
 *
 * @pseudocode
 * 1. Log debug entry if not in Vitest.
 * 2. Record `roundDecisionEnter` timestamp via `exposeDebugState`.
 * 3. Emit `debugPanelUpdate` event.
 */
/**
 * Compute round outcome and dispatch the resulting events.
 *
 * @param {object} store
 * @param {object} machine
 * @returns {Promise<void>}
 * @pseudocode
 * ```
 * if not in roundDecision or already resolved → return
 * if no player choice → dispatch interrupt(stalledNoSelection)
 * outcomeEvent ← determineOutcomeEvent(store)
 * record debug guard timing
 * await dispatchOutcome(outcomeEvent, machine)
 * emit debug panel update
 * ```
 */
export async function computeAndDispatchOutcome(store, machine) {
  try {
    debugLog("DEBUG: computeAndDispatchOutcome start", { playerChoice: store?.playerChoice });
    if (!isStateTransition(null, "roundDecision")) return;
    const rd = readDebugState("roundDebug");
    const resolved = rd && typeof rd.resolvedAt === "number";
    if (resolved) return;
    if (!store?.playerChoice) {
      await machine.dispatch("interrupt", { reason: "stalledNoSelection" });
      return;
    }
    const outcomeEvent = determineOutcomeEvent(store);
    debugLog("DEBUG: computeAndDispatchOutcome outcomeEvent", { outcomeEvent });
    try {
      exposeDebugState("guardFiredAt", Date.now());
      exposeDebugState("guardOutcomeEvent", outcomeEvent || "none");
    } catch {}
    await dispatchOutcome(outcomeEvent, machine);
    emitBattleEvent("debugPanelUpdate");
  } catch {}
}

/**
 * Determine the outcome event based on player and opponent stat values.
 *
 * @param {object} store
 * @returns {string|null}
 * @pseudocode
 * ```
 * read player and opponent values
 * if both numbers → return corresponding outcome event
 * else → null
 * ```
 */
function determineOutcomeEvent(store) {
  try {
    const stat = store.playerChoice;
    const pCard = document.getElementById("player-card");
    const oCard = document.getElementById("opponent-card");
    const playerVal = getStatValue(pCard, stat);
    debugLog("DEBUG: computeAndDispatchOutcome values", { stat, playerVal });
    let opponentVal = 0;
    try {
      const opp = getOpponentJudoka();
      const raw = opp && opp.stats ? Number(opp.stats[stat]) : NaN;
      opponentVal = Number.isFinite(raw) ? raw : getStatValue(oCard, stat);
    } catch {
      opponentVal = getStatValue(oCard, stat);
    }
    if (Number.isFinite(playerVal) && Number.isFinite(opponentVal)) {
      if (playerVal > opponentVal) return "outcome=winPlayer";
      if (playerVal < opponentVal) return "outcome=winOpponent";
      return "outcome=draw";
    }
  } catch {}
  return null;
}

/**
 * Dispatch the outcome or interrupt if none exists.
 *
 * @param {string|null} outcomeEvent
 * @param {object} machine
 * @returns {Promise<void>}
 * @pseudocode
 * ```
 * if outcome event → schedule dispatch(outcomeEvent) and dispatch(continue)
 * else → dispatch interrupt(guardNoOutcome)
 * ```
 */
async function dispatchOutcome(outcomeEvent, machine) {
  if (outcomeEvent) {
    // Avoid re-entrant dispatch inside onEnter; schedule transitions
    // after onEnter/microtasks complete.
    try {
      const run = async () => {
        try {
          await machine.dispatch(outcomeEvent);
          if (autoContinue) await machine.dispatch("continue");
        } catch {}
      };
      if (typeof queueMicrotask === "function") queueMicrotask(run);
      setTimeout(run, 0);
    } catch {
      try {
        await machine.dispatch(outcomeEvent);
        if (autoContinue) await machine.dispatch("continue");
      } catch {}
    }
  } else {
    await machine.dispatch("interrupt", { reason: "guardNoOutcome" });
  }
}

/**
 * Schedule a timeout that computes the round outcome if resolution stalls.
 *
 * @param {object} store
/**
 * Record entry into the round decision state for debug purposes.
 *
 * @pseudocode
 * ```
 * log debug entry if not in Vitest
 * record timestamp on window
 * emit debug panel update
 * ```
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary Stamp round decision entry for diagnostics.
 * @pseudocode
 * 1. Log debug message when not under Vitest.
 * 2. Store `Date.now()` using `exposeDebugState('roundDecisionEnter')`.
 * 3. Emit `debugPanelUpdate` to refresh the panel.
 */
export function recordEntry() {
  try {
    debugLog("DEBUG: Entering roundDecisionEnter");
  } catch {}
  try {
    if (typeof window !== "undefined") {
      exposeDebugState("roundDecisionEnter", Date.now());
    }
  } catch {}
  emitBattleEvent("debugPanelUpdate");
}

/**
 * Resolve the round immediately if a selection exists.
 *
 * @param {object} store
 * @returns {Promise<boolean>} whether a resolution occurred
 * @pseudocode
 * ```
 * if no player choice → return false
 * read stat values
 * log debug values
 * await resolveRound
 * return true
 * ```
 */
export async function resolveSelectionIfPresent(store) {
  if (!store.playerChoice) return false;
  const stat = store.playerChoice;
  const pCard = document.getElementById("player-card");
  const oCard = document.getElementById("opponent-card");
  const playerVal = getStatValue(pCard, stat);
  let opponentVal = 0;
  try {
    const opp = getOpponentJudoka();
    const raw = opp && opp.stats ? Number(opp.stats[stat]) : NaN;
    opponentVal = Number.isFinite(raw) ? raw : getStatValue(oCard, stat);
  } catch {
    opponentVal = getStatValue(oCard, stat);
  }
  try {
    debugLog("DEBUG: roundDecision.resolveImmediate", { stat, playerVal, opponentVal });
  } catch {}
  await resolveRound(store, stat, playerVal, opponentVal);
  return true;
}

/**
 * Await a player's stat selection or time out.
 *
 * @param {object} store - Battle store.
 * @param {number} timeoutMs - Maximum wait in milliseconds.
 * @returns {Promise<void>} Resolves on selection or rejects on timeout.
 * @pseudocode
 * 1. If `store.playerChoice` exists → resolve immediately.
 * 2. Listen for `statSelected` battle events.
 * 3. Poll the store for a new `playerChoice`.
 * 4. Start a timeout that rejects after `timeoutMs`.
 * 5. Resolve when either the event fires or the store updates; otherwise reject on timeout.
 */
export function waitForPlayerChoice(store, timeoutMs) {
  if (store.playerChoice) return Promise.resolve();

  let handler;
  let pollId;
  let timeoutId;

  const cleanup = () => {
    offBattleEvent("statSelected", handler);
    if (pollId) clearInterval(pollId);
    if (timeoutId) clearTimeout(timeoutId);
  };

  const eventPromise = new Promise((resolve) => {
    handler = () => {
      cleanup();
      resolve();
    };
    onBattleEvent("statSelected", handler);
  });

  const storePromise = new Promise((resolve) => {
    pollId = setInterval(() => {
      if (store.playerChoice) {
        cleanup();
        resolve();
      }
    }, 50);
  });

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("timeout"));
    }, timeoutMs);
  });

  return Promise.race([eventPromise, storePromise, timeoutPromise]);
}

/**
 * Await a player's choice and resolve the round.
 *
 * @param {object} store
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Wait up to 1500 ms for `waitForPlayerChoice`.
 * 2. Resolve selection via `resolveSelectionIfPresent`.
 */
export async function awaitPlayerChoice(store) {
  // Only wait for the choice here; actual resolution is handled by
  // resolveSelectionIfPresent() before this call or by the scheduled
  // guard via guardSelectionResolution().
  await waitForPlayerChoice(store, 1500);
}

/**
 * Schedule outcome computation and expose a cancellation guard.
 *
 * @param {object} store
 * @param {object} machine
 * @returns {() => void} cleanup function
 * @pseudocode
 * 1. Schedule guard to run `computeAndDispatchOutcome` after 1200 ms.
 * 2. Save cancel function via `exposeDebugState('roundDecisionGuard')`.
 * 3. Return a cleanup function that clears the guard and nulls the global.
 */
export function guardSelectionResolution(store, machine) {
  const cancel = scheduleGuard(1200, () => computeAndDispatchOutcome(store, machine));
  exposeDebugState("roundDecisionGuard", cancel);
  return () => {
    guard(() => {
      const fn = readDebugState("roundDecisionGuard");
      if (typeof fn === "function") fn();
      exposeDebugState("roundDecisionGuard", null);
    });
  };
}

/**
 * Schedule watchdog to ensure state progression after resolution.
 *
 * @param {object} machine
 * @pseudocode
 * 1. After 600 ms, if state is still `roundDecision`, dispatch interrupt with `postResolveWatchdog`.
 */
export function schedulePostResolveWatchdog(machine) {
  setTimeout(() => {
    guardAsync(async () => {
      const still = machine.getState ? machine.getState() : null;
      if (still === "roundDecision") {
        await machine.dispatch("interrupt", { reason: "postResolveWatchdog" });
      }
    });
  }, 600);
}

/**
 * Orchestrate round decision entry by composing small helpers.
 *
 * @param {object} machine
 * @returns {Promise<void>}
 * @pseudocode
 * recordEntry()
 * cancel ← guardSelectionResolution(store, machine)
 * if !resolveSelectionIfPresent(store) → awaitPlayerChoice(store)
 * cancel()
 * schedulePostResolveWatchdog(machine)
 * on timeout → show "No selection" and interrupt
 * on other error → handleRoundError(`roundResolutionError`)
 */
export async function roundDecisionEnter(machine) {
  const { store } = machine.context;
  recordEntry();
  const cancel = guardSelectionResolution(store, machine);
  try {
    const resolved = await resolveSelectionIfPresent(store);
    if (!resolved) await awaitPlayerChoice(store);
    cancel();
    schedulePostResolveWatchdog(machine);
  } catch (err) {
    cancel();
    if (err?.message === "timeout") {
      guard(() =>
        emitBattleEvent("scoreboardShowMessage", "No selection detected. Interrupting round.")
      );
      guard(() => emitBattleEvent("debugPanelUpdate"));
      await guardAsync(() => machine.dispatch("interrupt", { reason: "noSelection" }));
    } else {
      await handleRoundError(machine, "roundResolutionError", err);
    }
  }
}
export async function roundDecisionExit() {
  // Clear any scheduled decision guard to prevent late outcome dispatch.
  try {
    const fn = readDebugState("roundDecisionGuard");
    if (typeof fn === "function") fn();
    exposeDebugState("roundDecisionGuard", null);
  } catch {}
}

/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * onEnter handler for `roundOver` state.
 *
 * @pseudocode
 * 1. Clear any transient selection state from the store so the next round
 *    starts with a clean slate.
 * 2. Return immediately; UI updates are handled elsewhere.
 *
 * @param {object} machine
 */
export async function roundOverEnter(machine) {
  const store = machine?.context?.store;
  if (store) {
    store.playerChoice = null;
    store.selectionMade = false;
  }
}

/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export async function matchDecisionEnter() {}

/**
 * onEnter handler for the `matchOver` state.
 *
 * @pseudocode
 * 1. Emit a `matchOver` battle event so consumers can show restart controls.
 */
export async function matchOverEnter() {
  emitBattleEvent("matchOver");
}

/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * onEnter handler for `interruptRound`.
 *
 * @pseudocode
 * 1. Clear scoreboard messages and update debug panel.
 * 2. Clear any pending selection and scheduled guards.
 * 3. Persist the last interrupt reason to `window` for diagnostics.
 * 4. If `payload.adminTest` -> dispatch `roundModification` with payload,
 *    otherwise dispatch `restartRound` to reach cooldown.
 *
 * @param {object} machine
 * @param {object} [payload]
 */
export async function interruptRoundEnter(machine, payload) {
  emitBattleEvent("scoreboardClearMessage");
  emitBattleEvent("debugPanelUpdate");
  // Ensure store selection is cleared when an interrupt occurs so leftover
  // `playerChoice` doesn't persist and block future rounds.
  try {
    const store = machine?.context?.store;
    if (store) {
      store.playerChoice = null;
      store.selectionMade = false;
    }
    const fn = readDebugState("roundDecisionGuard");
    if (typeof fn === "function") fn();
    exposeDebugState("roundDecisionGuard", null);
  } catch {}
  // Expose the last interrupt reason for diagnostics and tests
  try {
    exposeDebugState("classicBattleLastInterruptReason", payload?.reason || "");
  } catch {}
  if (payload?.reason) {
    emitBattleEvent("scoreboardShowMessage", `Round interrupted: ${payload.reason}`);
  }
  if (payload?.adminTest) {
    await machine.dispatch("roundModification", payload);
  } else {
    // Use the state-table-defined trigger to reach cooldown
    await machine.dispatch("restartRound");
  }
}

/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * onEnter handler for `interruptMatch`.
 *
 * @pseudocode
 * 1. Clear scoreboard messages and update debug panel.
 * 2. Show an interrupt message when a reason is provided.
 * 3. Trigger the state-table-defined `toLobby` transition with payload.
 *
 * @param {object} machine
 * @param {object} [payload]
 */
export async function interruptMatchEnter(machine, payload) {
  emitBattleEvent("scoreboardClearMessage");
  emitBattleEvent("debugPanelUpdate");
  if (payload?.reason) {
    emitBattleEvent("scoreboardShowMessage", `Match interrupted: ${payload.reason}`);
  }
  // Return to lobby via state-table-defined trigger
  await machine.dispatch("toLobby", payload);
}

/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * onEnter handler for `roundModification`.
 *
 * @pseudocode
 * 1. Clear scoreboard messages and update debug panel.
 * 2. If payload.modification -> show a message describing the modification.
 * 3. If payload.resumeRound -> dispatch `roundStart`, else dispatch `cooldown`.
 *
 * @param {object} machine
 * @param {object} [payload]
 */
export async function roundModificationEnter(machine, payload) {
  emitBattleEvent("scoreboardClearMessage");
  emitBattleEvent("debugPanelUpdate");
  if (payload?.modification) {
    emitBattleEvent("scoreboardShowMessage", `Round modified: ${payload.modification}`);
  }
  if (payload?.resumeRound) {
    await machine.dispatch("roundStart");
  } else {
    await machine.dispatch("cooldown");
  }
}

export const onEnterHandlers = {
  waitingForMatchStart: waitingForMatchStartEnter,
  matchStart: matchStartEnter,
  cooldown: cooldownEnter,
  roundStart: roundStartEnter,
  waitingForPlayerAction: waitingForPlayerActionEnter,
  roundDecision: roundDecisionEnter,
  roundOver: roundOverEnter,
  matchDecision: matchDecisionEnter,
  matchOver: matchOverEnter,
  interruptRound: interruptRoundEnter,
  interruptMatch: interruptMatchEnter,
  roundModification: roundModificationEnter
};

export const onExitHandlers = {
  waitingForPlayerAction: waitingForPlayerActionExit,
  roundDecision: roundDecisionExit
};
