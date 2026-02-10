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
 * @param {{
 * autoSelectId: ReturnType<typeof setTimeout> | null,
 * autoSelectCountdownId?: ReturnType<typeof setTimeout> | null,
 * autoSelectExecuteId?: ReturnType<typeof setTimeout> | null,
 * roundsPlayed?: number
 * }} store Battle state store.
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
 * 2. Store each timeout id on `store.autoSelectId`, `store.autoSelectCountdownId`, and
 *    `store.autoSelectExecuteId`.
 */
/**
 * Schedule a stalled-selection prompt and optional auto-select.
 *
 * @param {{
 * autoSelectId: ReturnType<typeof setTimeout> | null,
 * autoSelectCountdownId?: ReturnType<typeof setTimeout> | null,
 * autoSelectExecuteId?: ReturnType<typeof setTimeout> | null,
 * roundsPlayed?: number
 * }} store Battle state store.
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
 * 2. Store timeout IDs in `store.autoSelectId`, `store.autoSelectCountdownId`, and
 *    `store.autoSelectExecuteId` for cleanup.
 */
export function handleStatSelectionTimeout(store, onSelect, timeoutMs = 5000) {
  const scheduler = getScheduler();
  const scheduledRoundToken = Number.isFinite(Number(store?.roundsPlayed))
    ? Number(store.roundsPlayed)
    : null;
  const isStaleRound = () => {
    if (!store || typeof store !== "object") {
      return true;
    }
    const currentRoundToken = Number.isFinite(Number(store.roundsPlayed))
      ? Number(store.roundsPlayed)
      : null;
    return currentRoundToken !== scheduledRoundToken;
  };
  if (store && typeof store === "object") {
    store.selectionTimeoutScheduler = scheduler;
    store.statTimeoutScheduler = scheduler;
    store.autoSelectScheduler = scheduler;
    store.autoSelectRoundToken = scheduledRoundToken;
    store.autoSelectCountdownId = null;
    store.autoSelectExecuteId = null;
  }
  store.autoSelectId = scheduler.setTimeout(() => {
    if (store?.selectionMade || isStaleRound()) return;

    // 1. Show stalled message
    const stalledMsg = t("ui.statSelectionStalled");
    showSnackbar(stalledMsg);

    if (!isEnabled("autoSelect")) {
      try {
        scoreboard.showMessage(stalledMsg);
      } catch (error) {
        // Scoreboard might not be initialized in test environments
        console.warn("[autoSelect] Scoreboard not available:", error);
      }
    }

    try {
      emitBattleEvent("statSelectionStalled");
    } catch (error) {
      console.warn("[autoSelect] Failed to emit battle event:", error);
    }

    if (isEnabled("autoSelect")) {
      // 2. Schedule countdown message
      store.autoSelectCountdownId = scheduler.setTimeout(() => {
        if (store?.selectionMade || isStaleRound()) return;
        const secs = computeNextRoundCooldown();
        showSnackbar(t("ui.nextRoundIn", { seconds: secs }));

        // 3. Schedule auto-select
        store.autoSelectExecuteId = scheduler.setTimeout(() => {
          if (store?.selectionMade || isStaleRound()) return;
          try {
            autoSelectStat(onSelect);
          } catch (error) {
            console.error("[autoSelect] Failed to auto-select stat:", error);
          }
        }, 250); // 250ms after countdown message
      }, 800); // 800ms after stalled message
    }
  }, timeoutMs);
}
