import * as scoreboard from "../setupScoreboard.js";
import { updateDebugPanel } from "./debugPanel.js";
import { onBattleEvent, getBattleEventTarget, emitBattleEvent } from "./battleEvents.js";
import { bindCountdownEventHandlersOnce } from "./timerService.js";

// --- Event bindings ---
function bindUIServiceEventHandlers() {
  // Register listeners exactly once per EventTarget instance
  onBattleEvent("scoreboardClearMessage", () => {
    try {
      scoreboard.clearMessage();
    } catch (err) {
      console.error("Error clearing scoreboard message:", err);
    }
  });

  onBattleEvent("scoreboardShowMessage", (e) => {
    try {
      scoreboard.showMessage(e.detail);
    } catch (err) {
      console.error("Error in scoreboard.showMessage:", err);
    }
  });

  onBattleEvent("debugPanelUpdate", () => {
    try {
      updateDebugPanel();
    } catch (err) {
      console.error("Error updating debug panel:", err);
    }
  });

  // Ensure any summary or per-round UI cleans up correctly between rounds
  onBattleEvent("roundReset", () => {
    try {
      // Close any open summary modals to avoid stale data bleed
      const modalEl = document.querySelector(".modal");
      if (modalEl?.close) modalEl.close();
      // Clear scoreboard messages
      scoreboard.clearMessage?.();
      try {
        document.body?.removeAttribute?.("data-stat-selected");
      } catch {}
      // Broadcast a UI reset for components that subscribe
      emitBattleEvent("ui.roundReset");
    } catch {}
  });

}

/**
 * Bind UI service handlers once per battle event target.
 *
 * Mirrors the previous module-level binding behavior but defers execution
 * until explicitly invoked so tests can control when listeners register.
 *
 * @pseudocode
 * 1. Assume binding should occur; fetch the shared battle event target.
 * 2. Look up (or create) the WeakSet tracking bound targets.
 * 3. If the target is already tracked, skip binding.
 * 4. Otherwise add the target and delegate to `bindUIServiceEventHandlers`.
 *
 * @returns {void}
 */
export function bindUIServiceEventHandlersOnce() {
  let shouldBind = true;
  try {
    const KEY = "__cbUiServiceBoundTargets";
    const target = getBattleEventTarget();
    if (target) {
      const set = (globalThis[KEY] ||= new WeakSet());
      if (set.has(target)) shouldBind = false;
      else set.add(target);
    }
  } catch {}
  if (shouldBind) {
    bindUIServiceEventHandlers();
  }
  try {
    bindCountdownEventHandlersOnce();
  } catch {}
}
