import { isEnabled } from "../../helpers/featureFlags.js";
import { onBattleEvent, offBattleEvent } from "../../helpers/classicBattle/battleEvents.js";
import {
  handleGlobalKey,
  handleStatListArrowKey,
  handleCommandHistory,
  handleIntent
} from "./battleHandlers.js";

const byId = (id) => document.getElementById(id);
const arrowKeys = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

/**
 * Handle arrow navigation within the stat list.
 *
 * @param {KeyboardEvent} e - Key event.
 * @returns {boolean} True when the key was handled.
 * @pseudocode
 * list = byId('cli-stats')
 * if list exists AND key is arrow AND list has focus:
 *   e.preventDefault()
 *   handleStatListArrowKey(key)
 *   return true
 * return false
 */
function handleArrowNav(e) {
  const key = e.key;
  const list = byId("cli-stats");
  if (
    list &&
    arrowKeys.has(key) &&
    (list === document.activeElement || list.contains(document.activeElement))
  ) {
    e.preventDefault();
    handleStatListArrowKey(key);
    return true;
  }
  return false;
}

/**
 * Determine if a key should be processed.
 *
 * @param {string} key - Lowercased key value.
 * @returns {boolean} True when processing should continue.
 * @pseudocode
 * if key is 'escape' or 'esc': return false
 * if cliShortcuts disabled AND key != 'q': return false
 * if active element is input/textarea/select/contenteditable: return false
 * return true
 */
function shouldProcessKey(key) {
  if (key === "escape" || key === "esc") return false;
  if (!isEnabled("cliShortcuts") && key !== "q") return false;

  const activeElement = document.activeElement;
  if (
    activeElement &&
    (activeElement.tagName === "INPUT" ||
      activeElement.tagName === "TEXTAREA" ||
      activeElement.tagName === "SELECT" ||
      activeElement.contentEditable === "true")
  ) {
    return false;
  }

  return true;
}

/**
 * Resolve an intent from focused control for Enter/Space activation.
 *
 * @returns {{type: string, [key: string]: any}|null} Intent object or null.
 * @pseudocode
 * dataset = document.activeElement?.dataset
 * if no dataset: return null
 * if dataset.stat or statIndex exists:
 *   return { type: 'selectFocusedStat', stat, statIndex }
 * if dataset.cliControl is set:
 *   return { type: 'activateFocusedControl', control }
 * return null
 */
function resolveFocusedControlIntent() {
  const dataset = document.activeElement?.dataset;
  if (!dataset) return null;

  if (dataset.stat || dataset.statIndex !== undefined) {
    return {
      type: "selectFocusedStat",
      stat: dataset.stat,
      statIndex: dataset.statIndex
    };
  }

  if (dataset.cliControl) {
    return {
      type: "activateFocusedControl",
      control: dataset.cliControl
    };
  }

  return null;
}

/**
 * Map raw key input to domain intent.
 *
 * @param {string} key - Lowercased key value.
 * @returns {{type: string, [key: string]: any}|null} Intent or null.
 * @pseudocode
 * if handleGlobalKey(key): return { type: 'globalKeyHandled' }
 * if numeric key: return selectStatByIndex intent
 * if enter/space: resolve focused intent OR continue intent
 * if tab: return { type: 'tabNavigation' }
 * return { type: 'unmappedKey', key }
 */
function mapKeyToIntent(key) {
  if (handleGlobalKey(key)) {
    return { type: "globalKeyHandled", key };
  }

  if (key >= "0" && key <= "9") {
    return { type: "selectStatByIndex", index: Number(key) };
  }

  if (key === "enter" || key === " ") {
    return resolveFocusedControlIntent() || { type: "confirmFocusedControl", key };
  }

  if (key === "tab") {
    return { type: "tabNavigation" };
  }

  return { type: "unmappedKey", key };
}

/**
 * Handle key input for the CLI page.
 *
 * @param {KeyboardEvent} e - Key event.
 * @returns {void}
 * @pseudocode
 * if handleArrowNav(e): return
 * handle command history navigation
 * if shouldProcessKey is false: clear escape error state and return
 * map key -> intent
 * dispatch intent via handleIntent
 * prevent default for handled intents
 * show invalid feedback only from rejection event listener
 */
export function onKeyDown(e) {
  if (e.ctrlKey && isEnabled("cliShortcuts")) {
    if (handleCommandHistory(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  }

  if (handleArrowNav(e)) return;

  if (isEnabled("cliShortcuts") && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
    if (handleCommandHistory(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  }

  const lower = e.key.toLowerCase();
  if (!shouldProcessKey(lower)) {
    if (lower === "escape" || lower === "esc") {
      const shortcuts = byId("cli-shortcuts");
      if (shortcuts?.open) {
        shortcuts.open = false;
      }

      try {
        const dialogs = Array.from(document.querySelectorAll("dialog.modal[open]"));
        const activeDialog = dialogs.at(-1);
        if (activeDialog) {
          const cancelEvent = new Event("cancel", { bubbles: false, cancelable: true });
          activeDialog.dispatchEvent(cancelEvent);
          if (!cancelEvent.defaultPrevented && typeof activeDialog.close === "function") {
            activeDialog.close();
          }
        }
      } catch {}

      const countdown = byId("cli-countdown");
      if (countdown) {
        delete countdown.dataset.status;
        const remaining = Number(countdown.dataset.remainingTime);
        if (!Number.isFinite(remaining) || remaining <= 0) {
          countdown.textContent = "";
        }
      }
    }
    return;
  }

  const intent = mapKeyToIntent(lower);
  if (!intent) {
    return;
  }

  const handled = handleIntent(intent);
  if (handled === true) {
    try {
      e.preventDefault();
    } catch {}
    try {
      e.stopPropagation();
    } catch {}
  }

  const countdown = byId("cli-countdown");
  if (!countdown || lower === "tab") {
    return;
  }

  if (handled === "rejected") {
    countdown.textContent = "Invalid key, press H for help";
    countdown.dataset.status = "error";
    return;
  }

  if (handled === true && countdown.dataset.status === "error") {
    delete countdown.dataset.status;
    countdown.textContent = "";
  }
}

/**
 * Install rejection-event feedback for key intent handling.
 *
 * @returns {() => void} Cleanup function.
 * @pseudocode
 * subscribe to battle.intent.rejected
 * when source is keyboard, render canonical invalid-key message
 * return unsubscribe callback
 */
export function installIntentRejectionFeedback() {
  const handler = (event) => {
    const detail = event?.detail || {};
    if (detail.source !== "keyboard") return;
    const countdown = byId("cli-countdown");
    if (!countdown) return;
    countdown.textContent = "Invalid key, press H for help";
    countdown.dataset.status = "error";
  };

  onBattleEvent("battle.intent.rejected", handler);
  return () => {
    try {
      offBattleEvent("battle.intent.rejected", handler);
    } catch {}
  };
}
