import { emitBattleEvent } from "./battleEvents.js";

/**
 * Ensure round UI event listeners and promises are registered.
 * Importing this module has side effects that bind onBattleEvent handlers.
 */
export async function ensureBindings() {
  await import("./roundUI.js");
  await import("./promises.js");
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
