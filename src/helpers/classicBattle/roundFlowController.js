import { onBattleEvent, getBattleEventTarget } from "./battleEvents.js";
import { handleRoundStartedEvent, handleRoundResolvedEvent } from "./roundUI.js";
import { showRoundOutcome } from "./uiHelpers.js";

/**
 * Bind round flow UI handlers for engine-driven events.
 *
 * @pseudocode
 * 1. Listen for `roundStarted` and forward to the round UI handler.
 * 2. Listen for `roundResolved`, run UI cleanup, and surface the outcome message.
 *
 * @returns {void}
 */
export function bindRoundFlowController() {
  onBattleEvent("roundStarted", (event) => {
    handleRoundStartedEvent(event).catch(() => {});
  });

  onBattleEvent("roundResolved", async (event) => {
    const { result, stat, playerVal, opponentVal } = event?.detail || {};
    if (result) {
      try {
        showRoundOutcome(result.message || "", stat, playerVal, opponentVal);
      } catch {}
    }
    await handleRoundResolvedEvent(event);
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
