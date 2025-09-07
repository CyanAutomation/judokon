import { isEnabled } from "../featureFlags.js";
import { t } from "../i18n.js";
import * as scoreboard from "../setupScoreboard.js";
import { showSnackbar } from "../showSnackbar.js";
import { emitBattleEvent } from "./battleEvents.js";
import { dispatchBattleEvent } from "./orchestrator.js";
import { autoSelectStat } from "./autoSelectStat.js";
import { computeNextRoundCooldown } from "../timers/computeNextRoundCooldown.js";
import { realScheduler } from "../scheduler.js";

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
 * @param {{ setTimeout: Function }} [scheduler=realScheduler] Scheduler for timeouts.
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
export function handleStatSelectionTimeout(
  store,
  onSelect,
  timeoutMs = 5000,
  scheduler = realScheduler
) {
  store.autoSelectId = scheduler.setTimeout(() => {
    if (store && store.selectionMade) return;
    const stalledMsg = t("ui.statSelectionStalled");
    scheduler.setTimeout(() => {
      try {
        showSnackbar(stalledMsg);
      } catch {}
      if (!isEnabled("autoSelect")) {
        try {
          scoreboard.showMessage(stalledMsg);
        } catch {}
      }
      try {
        emitBattleEvent("statSelectionStalled");
      } catch {}
    }, 100);
    if (isEnabled("autoSelect")) {
      try {
        const secs = computeNextRoundCooldown();
        scheduler.setTimeout(() => {
          try {
            showSnackbar(t("ui.nextRoundIn", { seconds: secs }));
          } catch {}
        }, 800);
      } catch {}
      try {
        scheduler.setTimeout(() => {
          try {
            autoSelectStat(onSelect);
          } catch {}
        }, 250);
      } catch {
        autoSelectStat(onSelect);
      }
    }
  }, timeoutMs);
}
