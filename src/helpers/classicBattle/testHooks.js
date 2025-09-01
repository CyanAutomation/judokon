import { emitBattleEvent, __resetBattleEventTarget } from "./battleEvents.js";
import { stopTimer } from "../battleEngineFacade.js";

// Internal flags to make bindings idempotent and allow limited rebinds in tests.
let __uiBound = false;
let __promisesBound = false;

/**
 * Ensure round UI event listeners and promises are registered.
 * Importing this module has side effects that bind onBattleEvent handlers.
 */
/**
 * Ensure Classic Battle listeners and test promises are ready.
 *
 * @pseudocode
 * 1. Import roundUI once to bind event listeners (idempotent per worker).
 * 2. Import promises; if `force`, cache-bust to create fresh awaitables post-mock.
 * 3. Track bound state to avoid duplicate UI bindings.
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

// Allow tests to clear the internal "promises bound" state so a subsequent
// ensureBindings({ force: true }) can recreate the awaitables after vi.doMock.
/**
 * Reset internal promise-bound flag so tests can rebind after vi.doMock().
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
export function resetBindings() {
  __promisesBound = false;
}

/**
 * Trigger the round timeout path immediately without waiting for the timer.
 * Mirrors the onExpired logic in startTimer.
 *
 * @pseudocode
 * 1. Import stat-selection helpers and dispatch utils.
 * 2. Stop any active timer to prevent overlap.
 * 3. Emit `roundTimeout`, auto-select a stat, and dispatch `timeout`.
 *
 * @param {ReturnType<typeof import('./roundManager.js').createBattleStore>} store
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
    return handleStatSelection(store, stat, { playerVal, opponentVal, ...opts });
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
 * Trigger the stalled-selection prompt immediately and auto-select a stat.
 *
 * @param {ReturnType<typeof import('./roundManager.js').createBattleStore>} store
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
export async function triggerStallPromptNow(store) {
  const { getOpponentJudoka } = await import("./cardSelection.js");
  const { getCardStatValue } = await import("./cardStatUtils.js");
  const { handleStatSelection } = await import("./selectionHandler.js");
  const { handleStatSelectionTimeout } = await import("./timerService.js");

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
