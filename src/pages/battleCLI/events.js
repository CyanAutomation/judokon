import { isEnabled } from "../../helpers/featureFlags.js";
import {
  handleGlobalKey,
  handleWaitingForPlayerActionKey,
  handleRoundOverKey,
  handleCooldownKey,
  handleStatListArrowKey
} from "../battleCLI.js";

const byId = (id) => document.getElementById(id);
const arrowKeys = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
const stateHandlers = {
  waitingForPlayerAction: handleWaitingForPlayerActionKey,
  roundOver: handleRoundOverKey,
  cooldown: handleCooldownKey
};

/**
 * Handle key input for the CLI page.
 *
 * @param {KeyboardEvent} e - Key event.
 * @pseudocode
 * key = e.key
 * if stats list focused and key is arrow -> handleStatListArrowKey
 * lower = key.toLowerCase()
 * if lower is 'escape' -> return
 * if shortcuts disabled and key not q -> return
 * handler = stateHandlers[current state]
 * handled = handleGlobalKey(lower) or handler(lower)
 * show "Invalid key" when not handled
 */
export function onKeyDown(e) {
  const key = e.key;
  const list = byId("cli-stats");
  if (
    list &&
    arrowKeys.has(key) &&
    (list === document.activeElement || list.contains(document.activeElement))
  ) {
    e.preventDefault();
    handleStatListArrowKey(key);
    return;
  }
  const lower = key.toLowerCase();
  if (lower === "escape") return;
  if (!isEnabled("cliShortcuts") && lower !== "q") return;
  const state = document.body?.dataset?.battleState || "";
  const handler = stateHandlers[state];
  const handled = handleGlobalKey(lower) || (handler ? handler(lower) : false);
  const countdown = byId("cli-countdown");
  if (!handled && lower !== "tab") {
    if (countdown) countdown.textContent = "Invalid key, press H for help";
  } else if (countdown && countdown.textContent) {
    countdown.textContent = "";
  }
}
