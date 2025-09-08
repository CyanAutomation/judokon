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
 * return true
 */
function shouldProcessKey(key) {
  if (key === "escape") return false;
  if (!isEnabled("cliShortcuts") && key !== "q") return false;
  return true;
}

/**
 * Route a key based on the current battle state.
 *
 * @param {string} key - Lowercased key value.
 * @returns {boolean} True when a handler consumed the key.
 * @pseudocode
 * state = document.body?.dataset?.battleState || ''
 * handler = stateHandlers[state]
 * return handleGlobalKey(key) OR handler(key)
 */
function routeKeyByState(key) {
  const state = document.body?.dataset?.battleState || "";
  const handler = stateHandlers[state];
  return handleGlobalKey(key) || (handler ? handler(key) : false);
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
  if (!handled && lower !== "tab") {
    if (countdown) countdown.textContent = "Invalid key, press H for help";
  } else if (countdown && countdown.textContent) {
    countdown.textContent = "";
  }
}
