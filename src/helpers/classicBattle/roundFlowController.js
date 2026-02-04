import { onBattleEvent, getBattleEventTarget } from "./battleEvents.js";
import { handleRoundStartedEvent, handleRoundResolvedEvent } from "./roundUI.js";
import { showRoundOutcome } from "./uiHelpers.js";
import { isEnabled } from "../featureFlags.js";
import { getOpponentDelay } from "./snackbar.js";

/**
 * Bind round flow UI handlers for engine-driven events.
 *
 * @pseudocode
 * 1. Listen for `roundStarted` and forward to the round UI handler.
 * 2. Listen for `round.evaluated`, run UI cleanup, and surface the outcome message.
 *
 * @returns {void}
 */
export function bindRoundFlowController() {
  let outcomeSequence = 0;
  let pendingOutcomeTimeoutId = null;
  let cachedOutcome = null;
  const clearPendingOutcomeDelay = () => {
    if (pendingOutcomeTimeoutId) {
      clearTimeout(pendingOutcomeTimeoutId);
    }
    pendingOutcomeTimeoutId = null;
  };

  const resolveOpponentDelayMs = () => {
    try {
      const override = Number(globalThis?.__OPPONENT_RESOLVE_DELAY_MS);
      if (Number.isFinite(override) && override >= 0) {
        return override;
      }
    } catch {}
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
      pendingOutcomeTimeoutId = setTimeout(resolve, delayMs);
    });
    if (sequence !== outcomeSequence) {
      return;
    }
    try {
      showRoundOutcome(message || "", resolvedStat, playerVal, opponentVal);
    } catch {}
  };

  onBattleEvent("roundStarted", (event) => {
    cachedOutcome = null;
    handleRoundStartedEvent(event).catch(() => {});
  });

  onBattleEvent("round.evaluated", async (event) => {
    cachedOutcome = event?.detail || null;
    await handleRoundResolvedEvent(event);
  });

  onBattleEvent("control.state.changed", (event) => {
    const toState = event?.detail?.to;
    if (toState !== "roundDisplay" && toState !== "evaluation") {
      return;
    }
    if (!cachedOutcome) return;
    const outcomeToDisplay = cachedOutcome;
    cachedOutcome = null;
    scheduleRoundOutcomeDisplay(outcomeToDisplay).catch(() => {});
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
