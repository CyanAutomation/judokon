import { setupFallbackTimer } from "./roundManager.js";
import { isTestModeEnabled } from "../testModeUtils.js";
import { getOpponentJudoka } from "./cardSelection.js";
import { getStatValue } from "../battle/index.js";
import { emitBattleEvent, onBattleEvent, offBattleEvent } from "./battleEvents.js";
import { resolveRound } from "./roundResolver.js";
import { guard, guardAsync, scheduleGuard } from "./guard.js";
import { exposeDebugState, readDebugState } from "./debugHooks.js";
import { debugLog } from "../debug.js";
import { handleRoundError } from "./handleRoundError.js";
import { initStartCooldown, initInterRoundCooldown } from "./cooldowns.js";
// Removed unused import for enableNextRoundButton

/**
 * Whether the orchestrator should automatically dispatch "continue" after an
 * outcome. Consumers like the CLI can toggle this for readability.
 *
 * @type {boolean}
 * @pseudocode
 * 1. Default to `true` so outcomes automatically advance the machine.
 * 2. Tests or CLI can set this to `false` to inspect intermediate UI states.
 */
export let autoContinue = true;

/**
 * Update the `autoContinue` behavior.
 *
 * @param {boolean} val - truthy to enable auto-continue, false to disable.
 * @returns {void}
 *
 * @pseudocode
 * 1. Coerce `val` to boolean (treating undefined as `true`).
 * 2. Store into module-scoped `autoContinue`.
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
/**
 * onEnter handler for `waitingForMatchStart`.
 *
 * Prepare UI and reset game state before the match begins.
 *
 * @param {object} machine - State machine instance.
 * @returns {Promise<void>}
 * @pseudocode
 * 1. No-op if the machine re-entered the same state.
 * 2. Call `doResetGame` from `machine.context` when available.
 * 3. Emit UI events to clear messages and update debug panels.
 * 4. Import and call scoreboard/UI helpers to ensure they are initialized.
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
    const helpers = await import("./debugPanel.js");
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
/**
 * onEnter handler for `matchStart` state.
 *
 * Immediately progress the state machine by dispatching `ready` so the
 * match flow can begin without extra delay.
 *
 * @param {object} machine - State machine instance.
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Dispatch `ready` with `{ initial: true }` to progress the state.
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
/**
 * onEnter handler for `cooldown` state.
 *
 * Choose between the initial match-start countdown or the regular
 * inter-round cooldown based on `payload.initial`.
 *
 * @param {object} machine - State machine instance.
 * @param {object} [payload] - Optional payload telling whether this is an initial cooldown.
 * @returns {Promise<void>}
 * @pseudocode
 * 1. If `payload.initial` -> initialize start cooldown.
 * 2. Otherwise ensure inter-round cooldown is scheduled when absent.
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
/**
 * onEnter handler for `roundStart` state.
 *
 * Trigger the round start routine and install test-mode fallbacks to
 * avoid UI stalls. On failure, attempt to recover via `handleRoundError`.
 *
 * @param {object} machine - State machine instance.
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Install a short fallback in test mode to advance if UI stalls.
 * 2. Invoke the round start routine from the machine context.
 * 3. On failure -> clear fallback and call `handleRoundError('roundStartError')`.
 * 4. If start succeeds and state still `roundStart` -> dispatch `cardsRevealed`.
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
/**
 * onEnter handler for `waitingForPlayerAction` state.
 *
 * Enable stat buttons and, if a selection already exists on the store,
 * advance immediately by dispatching `statSelected`.
 *
 * @param {object} machine - State machine instance.
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Emit `statButtons:enable` to allow player input.
 * 2. If `store.playerChoice` exists -> dispatch `statSelected` immediately.
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
/**
 * onExit handler for `waitingForPlayerAction` state.
 *
 * Disable stat buttons to avoid accepting input when the orchestrator
 * moves to a different state.
 *
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Emit `statButtons:disable` to turn off inputs.
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
/**
 * Record that the machine entered `roundDecision` for debug tracing.
 *
 * This stamps a timestamp in the debug state and triggers the debug panel
 * update so operators and tests can observe timing of the decision phase.
 *
 * @pseudocode
 * 1. Log debug entry if not in Vitest.
 * 2. Record `roundDecisionEnter` timestamp via `exposeDebugState`.
 * 3. Emit `debugPanelUpdate` event.
 *
 * @returns {void}
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
 * read player stat from store or DOM
 * read opponent stat from store or DOM
 * log debug values
 * await resolveRound
 * return true
 * ```
 */
export async function resolveSelectionIfPresent(store) {
  if (!store.playerChoice) return false;
  const stat = store.playerChoice;
  const hasDocument = typeof document !== "undefined";
  const pCard = hasDocument ? document.getElementById("player-card") : null;
  const oCard = hasDocument ? document.getElementById("opponent-card") : null;
  let playerVal = 0;
  if (store.currentPlayerJudoka?.stats) {
    const raw = Number(store.currentPlayerJudoka.stats[stat]);
    playerVal = Number.isFinite(raw) ? raw : 0;
  } else {
    playerVal = getStatValue(pCard, stat);
  }
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
/**
 * Schedule watchdog to ensure state progression after resolution.
 *
 * Some environments or UI failures can prevent the state machine from
 * advancing after a round has been resolved. This watchdog triggers an
 * interrupt when the machine remains in `roundDecision` after a short delay.
 *
 * @param {object} machine - State machine instance.
 * @returns {void}
 * @pseudocode
 * 1. Start a 600ms timer.
 * 2. When timer fires, check the machine state.
 * 3. If state is still `roundDecision`, dispatch an `interrupt` with reason `postResolveWatchdog`.
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
/**
 * onExit handler for `roundDecision`.
 *
 * Ensure any scheduled guards or cancellation hooks are cleared when
 * leaving the decision state to prevent late outcome dispatches.
 *
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Read `roundDecisionGuard` from debug state.
 * 2. If a cancel function exists, invoke it.
 * 3. Clear the debug state entry for the guard.
 */
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
/**
 * onEnter handler for `roundOver` state.
 *
 * Clear transient per-round state so the next round starts clean.
 *
 * @param {object} machine - State machine instance.
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Read `store` from `machine.context`.
 * 2. If present, clear `playerChoice` and `selectionMade` flags.
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
/**
 * onEnter handler for the `matchOver` state.
 *
 * Notify consumers that the match has concluded so they can reveal
 * restart or summary controls.
 *
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Emit `matchOver` battle event so UI components can react.
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
/**
 * onEnter handler for `interruptRound`.
 *
 * Handle an in-match interruption by clearing selection-related state,
 * cancelling resolution guards and optionally dispatching corrective
 * transitions depending on the payload.
 *
 * @param {object} machine - State machine instance.
 * @param {object} [payload] - Optional payload describing the interrupt.
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Clear scoreboard messages and update debug panel.
 * 2. Clear any pending player selection and cancel decision guards.
 * 3. Expose the last interrupt reason for diagnostics.
 * 4. Show an interrupt message if a reason exists.
 * 5. If `payload.adminTest` -> dispatch `roundModification` with payload, else dispatch `restartRound`.
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
/**
 * @returns {Promise<void>}
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
/**
 * @returns {Promise<void>}
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
