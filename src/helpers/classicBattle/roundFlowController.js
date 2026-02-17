import { onBattleEvent, getBattleEventTarget, emitBattleEvent } from "./battleEvents.js";
import { handleRoundStartedEvent, handleRoundResolvedEvent } from "./roundUI.js";
import { showRoundOutcome } from "./uiHelpers.js";
import { isEnabled } from "../featureFlags.js";
import { getOpponentDelay } from "./snackbar.js";
import { getSelectionDelayOverride } from "./selectionDelayCalculator.js";
import { EVENT_TYPES } from "./eventCatalog.js";
import { ensureClassicBattleScheduler } from "./timingScheduler.js";
import { applyControlStateTransition } from "./uiStateReducer.js";

/**
 * Bind round flow UI handlers for engine-driven events.
 *
 * @pseudocode
 * 1. Listen for canonical `state.roundStarted` and forward to the round UI handler.
 * 2. Listen for `round.evaluated`, run UI cleanup, and surface the outcome message.
 *
 * @returns {void}
 */
export function bindRoundFlowController() {
  const scheduler = ensureClassicBattleScheduler();
  let outcomeSequence = 0;
  let pendingOutcomeTimeoutId = null;
  const clearPendingOutcomeDelay = () => {
    if (pendingOutcomeTimeoutId) {
      scheduler.cancel(pendingOutcomeTimeoutId);
    }
    pendingOutcomeTimeoutId = null;
  };

  const resolveOpponentDelayMs = () => {
    const override = getSelectionDelayOverride();
    if (Number.isFinite(override) && override >= 0) {
      return override;
    }
    try {
      const configured = Number(getOpponentDelay());
      if (Number.isFinite(configured) && configured >= 0) {
        return configured;
      }
    } catch {}
    return 0;
  };

  const scheduleRoundOutcomeDisplay = async (outcome) => {
    const { message, statKey, stat, playerVal, opponentVal } = outcome || {};
    const resolvedStat = statKey ?? stat;
    if (!message && !resolvedStat) return;
    const sequence = ++outcomeSequence;
    clearPendingOutcomeDelay();
    const delayEnabled = isEnabled("opponentDelayMessage");
    const delayMs = delayEnabled ? resolveOpponentDelayMs() : 0;
    if (!delayEnabled || !Number.isFinite(delayMs) || delayMs <= 0) {
      try {
        showRoundOutcome(message || "", resolvedStat, playerVal, opponentVal);
      } catch {}
      return;
    }

    await new Promise((resolve) => {
      pendingOutcomeTimeoutId = scheduler.schedule(resolve, delayMs);
    });
    if (sequence !== outcomeSequence) {
      return;
    }
    try {
      emitBattleEvent("timer.opponentDelay.expired", { sequence, delayMs });
    } catch {}
    try {
      showRoundOutcome(message || "", resolvedStat, playerVal, opponentVal);
    } catch {}
  };

  onBattleEvent(EVENT_TYPES.STATE_ROUND_STARTED, (event) => {
    outcomeSequence += 1;
    clearPendingOutcomeDelay();
    handleRoundStartedEvent(event).catch(() => {});
  });

  onBattleEvent("round.evaluated", async (event) => {
    await handleRoundResolvedEvent(event);
    await scheduleRoundOutcomeDisplay(event?.detail || null);
  });

  onBattleEvent(EVENT_TYPES.STATE_TRANSITIONED, (event) => {
    const detail = event?.detail || {};
    applyControlStateTransition(detail);
  });
}

/**
 * Bind round flow UI handlers once per battle event target.
 *
 * @pseudocode
 * 1. Track the current battle event target in a WeakSet.
 * 2. If already bound, bail out.
 * 3. Otherwise bind the round flow controller.
 *
 * @returns {void}
 */
export function bindRoundFlowControllerOnce() {
  let shouldBind = true;
  try {
    const KEY = "__cbRoundFlowBoundTargets";
    const target = getBattleEventTarget();
    if (target) {
      const set = (globalThis[KEY] ||= new WeakSet());
      if (set.has(target)) shouldBind = false;
      else set.add(target);
    }
  } catch {}
  if (shouldBind) {
    bindRoundFlowController();
  }
}
