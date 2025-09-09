import { emitBattleEvent, __resetBattleEventTarget } from "./battleEvents.js";
import { stopTimer } from "../battleEngineFacade.js";

// Internal flags to make bindings idempotent and allow limited rebinds in tests.
let __uiBound = false;
let __promisesBound = false;

/**
 * Ensure Classic Battle UI listeners and test promises are registered.
 *
 * Binds the round UI event handlers and creates module-level awaitable
 * Promises used by tests. When `force` is true the function will attempt to
 * rebind dynamic handlers so test-time mocks are honored.
 *
 * @pseudocode
 * 1. If UI bindings are not present, import `./roundUI.js` to register static handlers.
 * 2. When `force` is set, reset the internal EventTarget and call the
 *    dynamic binding entrypoints so vi.mocks are respected.
 * 3. Ensure promises from `./promises.js` are created and reset when forced.
 *
 * @param {{force?: boolean}} [opts] - Optional flags. `force` rebinds dynamic handlers.
 * @returns {Promise<void>} Resolves when bindings and promises are available.
 */
export async function ensureBindings(opts = {}) {
  const force = !!opts.force;
  // Bind round UI listeners once per worker to avoid duplicate handlers.
  if (!__uiBound) {
    await import("./roundUI.js");
    __uiBound = true;
  } else if (force) {
    // Reset the event bus and bind dynamic handlers to honor vi.mocks.
    try {
      __resetBattleEventTarget();
    } catch {}
    const ui = await import("./roundUI.js");
    if (typeof ui.bindRoundUIEventHandlersDynamic === "function")
      ui.bindRoundUIEventHandlersDynamic();
    const eventHandlers = await import("./uiEventHandlers.js");
    if (typeof eventHandlers.bindUIHelperEventHandlersDynamic === "function")
      eventHandlers.bindUIHelperEventHandlersDynamic();
  }
  // Ensure event promises exist; allow a forced refresh after mocks in tests.
  if (!__promisesBound || force) {
    const prom = await import("./promises.js");
    if (typeof prom.resetBattlePromises === "function") prom.resetBattlePromises();
    __promisesBound = true;
  }
}

/**
 * Reset dynamic binding flags used during tests.
 *
 * Calling this releases the module-level marker that indicates promises and
 * dynamic handlers have been created so subsequent calls to
 * `ensureBindings({force:true})` will rebind handlers and recreate test
 * promises. This is intended for test harnesses that need to rewire
 * handlers between test cases.
 *
 * @pseudocode
 * 1. Clear the module-level `__promisesBound` flag so `ensureBindings` will
 *    re-import promise providers on next call.
 * 2. Clear any other module-level rebind markers (if present) to allow a
 *    fresh test harness setup.
 * 3. (No-op outside tests.)
 *
 * @returns {void}
 */
export function resetBindings() {
  __promisesBound = false;
}

/**
 * Trigger the round timeout flow immediately for tests.
 *
 * This helper mirrors the expiry behavior in `startTimer()` but runs
 * synchronously so tests don't need to advance real or fake timers.
 *
 * @pseudocode
 * 1. Import helpers that compute stat values and perform selection.
 * 2. Stop any running engine timer to avoid overlapping expirations.
 * 3. Emit `roundTimeout` to inform listeners and start auto-selection.
 * 4. Dispatch the `timeout` state transition and await the auto-select task.
 *
 * @param {ReturnType<typeof import('./roundManager.js').createBattleStore>} store - The battle store instance.
 * @returns {Promise<void>} Resolves after the timeout flow completes.
 */
export async function triggerRoundTimeoutNow(store) {
  const { getOpponentJudoka } = await import("./cardSelection.js");
  const { getCardStatValue } = await import("./cardStatUtils.js");
  const { handleStatSelection } = await import("./selectionHandler.js");
  const { dispatchBattleEvent } = await import("./orchestrator.js");
  const { autoSelectStat } = await import("./autoSelectStat.js");

  const onExpiredSelect = async (stat, opts) => {
    const playerCard = document.getElementById("player-card");
    const opponentCard = document.getElementById("opponent-card");
    const playerVal = getCardStatValue(playerCard, stat);
    let opponentVal = getCardStatValue(opponentCard, stat);
    try {
      const opp = getOpponentJudoka();
      const raw = opp && opp.stats ? Number(opp.stats[stat]) : NaN;
      opponentVal = Number.isFinite(raw) ? raw : opponentVal;
    } catch {}
    return handleStatSelection(store, stat, {
      playerVal,
      opponentVal,
      forceDirectResolution: true,
      ...opts
    });
  };
  stopTimer();
  try {
    emitBattleEvent("roundTimeout");
  } catch {}
  // Mirror timerService ordering: kick off auto-select immediately to
  // ensure `store.playerChoice` is set while the machine processes the
  // timeout transition into roundDecision.
  const selecting = (async () => {
    try {
      await autoSelectStat(onExpiredSelect, 0);
    } catch {}
  })();
  await dispatchBattleEvent("timeout");
  await selecting;
}

/**
 * Trigger the stalled-selection prompt immediately and schedule auto-select.
 *
 * Used by tests to surface the stall UI and cause an immediate auto-selection
 * without waiting for timeouts. This mirrors `handleStatSelectionTimeout`'s
 * behavior but runs synchronously.
 *
 * @pseudocode
 * 1. Import helpers for computing stat values and performing selection.
 * 2. Call `handleStatSelectionTimeout(store, onSelect, 0)` to schedule immediate action.
 * 3. Show a stall message and emit `statSelectionStalled` so tests can observe it.
 *
 * @param {ReturnType<typeof import('./roundManager.js').createBattleStore>} store - The battle store instance.
 * @returns {Promise<void>} Resolves after stall prompt setup completes.
 */
export async function triggerStallPromptNow(store) {
  const { getOpponentJudoka } = await import("./cardSelection.js");
  const { getCardStatValue } = await import("./cardStatUtils.js");
  const { handleStatSelection } = await import("./selectionHandler.js");
  const { handleStatSelectionTimeout } = await import("./autoSelectHandlers.js");

  const onSelect = (stat, opts) => {
    const playerCard = document.getElementById("player-card");
    const opponentCard = document.getElementById("opponent-card");
    const playerVal = getCardStatValue(playerCard, stat);
    let opponentVal = getCardStatValue(opponentCard, stat);
    try {
      const opp = getOpponentJudoka();
      const raw = opp && opp.stats ? Number(opp.stats[stat]) : NaN;
      opponentVal = Number.isFinite(raw) ? raw : opponentVal;
    } catch {}
    return handleStatSelection(store, stat, { playerVal, opponentVal, ...opts });
  };
  handleStatSelectionTimeout(store, onSelect, 0);
  // Surface the stall prompt immediately in tests to avoid waiting on timers.
  try {
    const scoreboard = await import("../setupScoreboard.js");
    scoreboard.showMessage("Stat selection stalled. Pick a stat or wait for auto-pick.");
  } catch {}
  try {
    const { emitBattleEvent } = await import("./battleEvents.js");
    emitBattleEvent("statSelectionStalled");
  } catch {}
}
