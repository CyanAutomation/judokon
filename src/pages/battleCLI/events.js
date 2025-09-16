import { isEnabled } from "../../helpers/featureFlags.js";
import {
  handleGlobalKey,
  handleWaitingForPlayerActionKey,
  handleRoundOverKey,
  handleCooldownKey,
  handleStatListArrowKey
} from "./battleHandlers.js";

const byId = (id) => document.getElementById(id);
const arrowKeys = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
const stateHandlers = {
  waitingForPlayerAction: handleWaitingForPlayerActionKey,
  roundOver: handleRoundOverKey,
  cooldown: handleCooldownKey
};

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
 * if key is 'escape': return false
 * if cliShortcuts disabled AND key != 'q': return false
 * if active element is input/textarea/select: return false
 * return true
 */
function shouldProcessKey(key) {
  if (key === "escape") return false;
  if (!isEnabled("cliShortcuts") && key !== "q") return false;

  // Don't process keys when user is typing in form controls
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
 * Route a key based on the current battle state.
 *
 * @param {string} key - Lowercased key value.
 * @returns {boolean|'ignored'} True when handled, 'ignored' when state doesn't support the key, false when invalid.
 * @pseudocode
 * state = document.body?.dataset?.battleState || ''
 * if state is 'waitingForMatchStart' and key is stat key: return 'ignored'
 * handler = stateHandlers[state]
 * return handleGlobalKey(key) OR handler(key) OR (if no handler: 'ignored')
 */
function routeKeyByState(key) {
  const state = document.body?.dataset?.battleState || "";

  // Suppress "Invalid key" for stat keys when no battle is active
  if (state === "waitingForMatchStart" && key >= "1" && key <= "5") {
    return "ignored";
  }

  const handler = stateHandlers[state];
  const globalHandled = handleGlobalKey(key);
  if (globalHandled) return true;

  if (handler) {
    return handler(key);
  }

  // No handler for this state, but don't show "Invalid key" for common keys
  if (state === "waitingForMatchStart" && key >= "0" && key <= "9") {
    return "ignored";
  }

  return false;
}

/**
 * Handle key input for the CLI page.
 *
 * @param {KeyboardEvent} e - Key event.
 * @pseudocode
 * if handleArrowNav(e): return
 * key = lowercased e.key
 * if not shouldProcessKey(key): return
 * handled = routeKeyByState(key)
 * show "Invalid key" when not handled and key != 'tab'
 */
/**
 * Global keydown handler for the Battle CLI page.
 *
 * @param {KeyboardEvent} e - The key event from the page.
 * @returns {void}
 *
 * @pseudocode
 * 1. Handle arrow navigation first via `handleArrowNav`.
 * 2. Lowercase the key and check `shouldProcessKey` to filter out ignored keys.
 * 3. Route the key based on current battle state and global handler.
 * 4. Update the countdown element with an error message when the key is not handled.
 */
export function onKeyDown(e) {
  if (handleArrowNav(e)) return;
  const lower = e.key.toLowerCase();
  if (!shouldProcessKey(lower)) return;
  const handled = routeKeyByState(lower);
  const countdown = byId("cli-countdown");
  if (handled === false && lower !== "tab") {
    if (countdown) countdown.textContent = "Invalid key, press H for help";
  } else if (countdown && countdown.textContent) {
    countdown.textContent = "";
  }
}
