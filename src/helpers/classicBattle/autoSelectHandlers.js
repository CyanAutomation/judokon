import { isEnabled } from "../featureFlags.js";
import { t } from "../i18n.js";
import * as scoreboard from "../setupScoreboard.js";
import { showSnackbar } from "../showSnackbar.js";
import { emitBattleEvent } from "./battleEvents.js";
import { dispatchBattleEvent } from "./eventDispatcher.js";
import { autoSelectStat } from "./autoSelectStat.js";
import { computeNextRoundCooldown } from "../timers/computeNextRoundCooldown.js";
import { getScheduler } from "../scheduler.js";

/**
 * Force a stat auto-select and ensure the state machine advances.
 *
 * @param {(stat: string, opts?: { delayOpponentMessage?: boolean }) => Promise<void>} onExpiredSelect
 * Callback handling auto-selected stat.
 * @returns {Promise<void>}
 * @summary Auto-select a stat and dispatch outcome on timer failure.
 * @pseudocode
 * 1. Show an error message on the scoreboard.
 * 2. If auto-select is enabled, call `autoSelectStat(onExpiredSelect)`.
 * 3. Otherwise dispatch `interrupt`.
 * 4. On any error, dispatch `interrupt` as a fallback.
 */
export async function forceAutoSelectAndDispatch(onExpiredSelect) {
  scoreboard.showMessage(t("ui.timerErrorAutoSelect"));
  try {
    if (isEnabled("autoSelect")) {
      await autoSelectStat(onExpiredSelect);
    } else {
      await dispatchBattleEvent("interrupt");
    }
  } catch {
    await dispatchBattleEvent("interrupt");
  }
}

/**
 * Schedule a stalled-selection prompt and optional auto-select.
 *
 * @param {{autoSelectId: ReturnType<typeof setTimeout> | null}} store Battle state store.
 * @param {(stat: string, opts?: { delayOpponentMessage?: boolean }) => void} onSelect Stat selection callback.
 * @param {number} [timeoutMs=5000] Delay before prompting.
 * @returns {void}
 * @summary Prompt for stalled stat selection and queue auto-select when enabled.
 * @pseudocode
 * 1. After `timeoutMs`, if no selection made:
 *    a. Show stalled snackbar and optionally scoreboard message.
 *    b. Emit `statSelectionStalled`.
 *    c. If auto-select enabled:
 *       i. Announce next-round countdown after a short delay.
 *       ii. Trigger `autoSelectStat(onSelect)` shortly after.
 * 2. Store the timeout id on `store.autoSelectId`.
 */
/**
 * Schedule a stalled-selection prompt and optional auto-select.
 *
 * @param {{autoSelectId: ReturnType<typeof setTimeout> | null}} store Battle state store.
 * @param {(stat: string, opts?: { delayOpponentMessage?: boolean }) => void} onSelect Stat selection callback.
 * @param {number} [timeoutMs=5000] Delay before prompting.
 * @returns {void}
 * @summary Prompt for stalled stat selection and queue auto-select when enabled.
 * @pseudocode
 * 1. After `timeoutMs`, if no selection made:
 *    a. Show stalled snackbar and optionally scoreboard message.
 *    b. Emit `statSelectionStalled`.
 *    c. If auto-select enabled:
 *       i. Announce next-round countdown after a short delay.
 *       ii. Auto-select a stat after countdown announcement.
 * 2. Store timeout ID in `store.autoSelectId` for cleanup.
 */
export function handleStatSelectionTimeout(store, onSelect, timeoutMs = 5000) {
  const scheduler = getScheduler();
  store.autoSelectId = scheduler.setTimeout(() => {
    if (store?.selectionMade) return;

    // 1. Show stalled message
    const stalledMsg = t("ui.statSelectionStalled");
    try {
      showSnackbar(stalledMsg);
      if (!isEnabled("autoSelect")) {
        scoreboard.showMessage(stalledMsg);
      }
      emitBattleEvent("statSelectionStalled");
    } catch {}

    if (isEnabled("autoSelect")) {
      // 2. Schedule countdown message
      scheduler.setTimeout(() => {
        if (store?.selectionMade) return;
        try {
          const secs = computeNextRoundCooldown();
          showSnackbar(t("ui.nextRoundIn", { seconds: secs }));
        } catch {}

        // 3. Schedule auto-select
        scheduler.setTimeout(() => {
          if (store?.selectionMade) return;
          try {
            autoSelectStat(onSelect);
          } catch {}
        }, 250); // 250ms after countdown message
      }, 800); // 800ms after stalled message
    }
  }, timeoutMs);
}
