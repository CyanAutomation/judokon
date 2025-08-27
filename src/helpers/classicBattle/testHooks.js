import { emitBattleEvent } from "./battleEvents.js";

// Internal flags to make bindings idempotent and allow limited rebinds in tests.
let __uiBound = false;
let __promisesBound = false;
let __rebindVersion = 0;

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
export async function ensureBindings(opts = {}) {
  const force = !!opts.force;
  // Bind round UI listeners once per worker to avoid duplicate handlers.
  if (!__uiBound) {
    await import("./roundUI.js");
    __uiBound = true;
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
export function resetBindings() {
  __promisesBound = false;
}

/**
 * Trigger the round timeout path immediately without waiting for the timer.
 * Mirrors the onExpired logic in startTimer.
 *
 * @param {ReturnType<typeof import('./roundManager.js').createBattleStore>} store
 */
export async function triggerRoundTimeoutNow(store) {
  const { getOpponentJudoka } = await import("./cardSelection.js");
  const { getCardStatValue } = await import("./cardStatUtils.js");
  const { handleStatSelection } = await import("./selectionHandler.js");
  const { default: eventBus, emitBattleEvent: emitEvt } = await import("./battleEvents.js");
  const { dispatchBattleEvent } = await import("./eventDispatcher.js");
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
  try {
    emitBattleEvent("roundTimeout");
  } catch {}
  await dispatchBattleEvent("timeout");
  await autoSelectStat(onExpiredSelect, 0);
}

/**
 * Trigger the stalled-selection prompt immediately and auto-select a stat.
 *
 * @param {ReturnType<typeof import('./roundManager.js').createBattleStore>} store
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
}
