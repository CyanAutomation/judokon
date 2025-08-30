import { interruptMatch } from "../battleEngineFacade.js";
import { dispatchBattleEvent } from "./orchestrator.js";
import { showMessage, clearTimer } from "../setupScoreboard.js";
import { stop as stopScheduler, cancel as cancelFrame } from "../../utils/scheduler.js";
import { resetSkipState } from "./skipHandler.js";
import { createModal } from "../../components/Modal.js";
import { createButton } from "../../components/Button.js";

let errorModal;

/**
 * Register global interrupt handlers for Classic Battle.
 *
 * @pseudocode
 * 1. Define `cleanup` to cancel timers, reset skip state, clear the scoreboard timer,
 *    and stop the shared scheduler.
 * 2. Attach navigation handlers for `pagehide` and `beforeunload` that:
 *    a. Call `cleanup`.
 *    b. Interrupt the match with reason "navigation".
 *    c. Show a concise scoreboard message.
 *    d. Dispatch `"interrupt"` with the reason.
 * 3. Attach error handlers for `error` and `unhandledrejection` that:
 *    a. Extract an error message.
 *    b. Call `cleanup`.
 *    c. Interrupt the match with reason "error".
 *    d. Surface an error dialog with the message.
 *    e. Dispatch `"interrupt"` with the reason.
 *
 * @param {{statTimeoutId: ReturnType<typeof setTimeout>|null, autoSelectId: ReturnType<typeof setTimeout>|null, compareRaf: number}} store
 * - Battle state store used to clear pending timers.
 */
export function initInterruptHandlers(store) {
  /**
   * Cancel timers and scheduler callbacks to prevent UI drift.
   *
   * @pseudocode
   * 1. Clear `statTimeoutId` and `autoSelectId` from the store and reset them.
   * 2. Cancel any scheduled frame via `compareRaf` and reset it.
   * 3. Reset skip handler state.
   * 4. Clear the scoreboard timer and stop the shared scheduler.
   *
   * @returns {void}
   */
  function cleanup() {
    try {
      clearTimeout(store.statTimeoutId);
      clearTimeout(store.autoSelectId);
      store.statTimeoutId = null;
      store.autoSelectId = null;
    } catch {}
    try {
      cancelFrame(store.compareRaf);
      store.compareRaf = 0;
    } catch {}
    try {
      resetSkipState();
    } catch {}
    try {
      clearTimer();
    } catch {}
    try {
      stopScheduler();
    } catch {}
  }

  /**
   * Handle navigation away from the page.
   *
   * @pseudocode
   * 1. Invoke `cleanup` to cancel timers and the scheduler.
   * 2. Call `interruptMatch("navigation")`.
   * 3. Show "Match interrupted: navigation" on the scoreboard.
   * 4. Dispatch `dispatchBattleEvent("interrupt", { reason: "navigation" })`.
   */
  function handleNavigation() {
    cleanup();
    try {
      interruptMatch("navigation");
    } catch {}
    try {
      showMessage("Match interrupted: navigation");
    } catch {}
    try {
      dispatchBattleEvent("interrupt", { reason: "navigation" });
    } catch {}
  }

  /**
   * Handle uncaught errors and promise rejections.
   *
   * @pseudocode
   * 1. Derive an error message from the event.
   * 2. Invoke `cleanup` to cancel timers and the scheduler.
   * 3. Call `interruptMatch("error")`.
   * 4. Show an error dialog with the message.
   * 5. Dispatch `dispatchBattleEvent("interrupt", { reason: message })`.
   *
   * @param {ErrorEvent|PromiseRejectionEvent} e - Error or rejection event.
   */
  function handleError(e) {
    const msg = e?.reason?.message || e?.reason || e?.message || "Unknown error";
    cleanup();
    try {
      interruptMatch("error");
    } catch {}
    showErrorDialog(msg);
    try {
      dispatchBattleEvent("interrupt", { reason: msg });
    } catch {}
  }

  window.addEventListener("pagehide", handleNavigation);
  window.addEventListener("beforeunload", handleNavigation);
  window.addEventListener("error", handleError);
  window.addEventListener("unhandledrejection", handleError);
}

/**
 * Surface a simple error dialog with a reload option.
 *
 * @pseudocode
 * 1. If no dialog exists, create a modal with an error message and Reload button.
 * 2. When Reload is clicked, reload the page.
 * 3. If the dialog exists, update its message.
 * 4. Open the modal and show the message on the scoreboard.
 *
 * @param {string} message - Error description to display.
 * @returns {void}
 */
function showErrorDialog(message) {
  try {
    showMessage(`Match interrupted: ${message}`);
  } catch {}
  if (!errorModal) {
    const title = document.createElement("h2");
    title.textContent = "Error";
    const desc = document.createElement("p");
    desc.textContent = message;
    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const reload = createButton("Reload", { id: "error-reload-btn", className: "primary-button" });
    reload.addEventListener("click", () => {
      try {
        window.location.reload();
      } catch {}
    });
    actions.appendChild(reload);
    const frag = document.createDocumentFragment();
    frag.append(title, desc, actions);
    errorModal = createModal(frag, { labelledBy: title, describedBy: desc });
    document.body.appendChild(errorModal.element);
  } else {
    const descEl = errorModal.element.querySelector("p");
    if (descEl) descEl.textContent = message;
  }
  try {
    errorModal.open();
  } catch {}
}