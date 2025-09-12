import { createModal } from "../../components/Modal.js";
import { createButton } from "../../components/Button.js";
import * as battleEngine from "../battleEngineFacade.js";
import { showResult } from "../battle/index.js";
import { getOutcomeMessage } from "../api/battleUI.js";
import { navigateToHome } from "../navUtils.js";
import { dispatchBattleEvent } from "./eventDispatcher.js";
import { getBattleState } from "./eventBus.js";
import { t } from "../i18n.js";

function createQuitConfirmation(store, onConfirm) {
  const title = document.createElement("h2");
  title.id = "quit-modal-title";
  title.textContent = t("modal.quit.title") || "Quit the match?";

  const desc = document.createElement("p");
  desc.id = "quit-modal-desc";
  desc.textContent = t("modal.quit.desc") || "Your progress will be lost.";

  const actions = document.createElement("div");
  actions.className = "modal-actions";

  const cancel = createButton(t("modal.quit.cancel") || "Cancel", {
    id: "cancel-quit-button",
    className: "secondary-button"
  });
  const quit = createButton(t("modal.quit.confirm") || "Quit", { id: "confirm-quit-button" });
  actions.append(cancel, quit);

  const frag = document.createDocumentFragment();
  frag.append(title, desc, actions);

  const modal = createModal(frag, { labelledBy: title, describedBy: desc });
  cancel.addEventListener("click", () => modal.close());
  quit.addEventListener("click", async () => {
    try {
      onConfirm();
    } catch {
      // If the engine is not initialized, fall back to showing a quit message
      // so the UI communicates the action without requiring engine state.
      try {
        showResult(getOutcomeMessage("quit"));
      } catch {}
    }
    modal.close();
    // Drive state machine to interruption path
    await dispatchBattleEvent("interrupt");
    const state = getBattleState();
    if (state === "interruptMatch") {
      await dispatchBattleEvent("toLobby");
    } else if (state === "interruptRound") {
      await dispatchBattleEvent("abortMatch");
    }
    // Navigate to home (robust to varying base paths like GH Pages)
    modal.destroy();
    store.quitModal = null;
    navigateToHome();
  });
  document.body.appendChild(modal.element);
  return modal;
}
/**
 * Promise that resolves with the confirm-quit button element when the quit
 * confirmation modal is presented. Tests can await `window.quitConfirmButtonPromise`
 * to interact with the modal's confirm button.
 *
 * @pseudocode
 * 1. Initialize `quitConfirmButtonPromise` with an immediately resolved promise.
 * 2. This promise will be replaced with a new pending promise each time `quitMatch` is called.
 * 3. The new promise will resolve with the `confirm-quit-button` element once it is rendered in the DOM.
 * 4. The promise is also exposed globally on `window.quitConfirmButtonPromise` for testability.
 *
 * @type {Promise<HTMLButtonElement>}
 * @returns {Promise<HTMLButtonElement>}
 */
export let quitConfirmButtonPromise = Promise.resolve();
/**
 * Trigger the Classic Battle quit confirmation modal and return the confirm button.
 *
 * Presents a modal asking the player to confirm quitting the match. A Promise
 * is exposed on `window.quitConfirmButtonPromise` so tests can await or act on
 * the confirm button DOM being available.
 *
 * @pseudocode
 * 1. Create a new promise and store it in `quitConfirmButtonPromise` and on window.
 * 2. Create the modal if `store.quitModal` is not already present.
 * 3. Open the modal, focusing the supplied `trigger` element when available.
 * 4. Poll for the confirm button element and resolve the promise once found.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {HTMLElement} [trigger] - Element that initiated the quit action.
 * @returns {Promise<HTMLButtonElement>} Resolves with the confirm button element.
 */
export function quitMatch(store, trigger) {
  let resolveBtn;
  quitConfirmButtonPromise = new Promise((resolve) => {
    resolveBtn = resolve;
  });
  window.quitConfirmButtonPromise = quitConfirmButtonPromise;
  if (!store.quitModal) {
    store.quitModal = createQuitConfirmation(store, () => {
      const result = battleEngine.quitMatch();
      showResult(getOutcomeMessage(result.outcome));
    });
  }
  const fallback = document.getElementById("quit-match-button");
  store.quitModal.open(trigger ?? fallback ?? undefined);
  const check = () => {
    const btn = document.getElementById("confirm-quit-button");
    if (btn) resolveBtn(btn);
    else requestAnimationFrame(check);
  };
  check();
  return quitConfirmButtonPromise;
}

/**
 * @summary Public test hook: a promise resolving to the confirm button of the
 * quit modal when it is opened.
 *
 * Tests can await `window.quitConfirmButtonPromise` to interact with the
 * confirm button. The promise is replaced every time `quitMatch` is invoked.
 *
 * @type {Promise<HTMLButtonElement>}
 */

/**
 * @summary Present the quit confirmation modal and expose the confirm button.
 * @pseudocode
 * 1. Create a new Promise and assign it to `quitConfirmButtonPromise` and `window`.
 * 2. If no modal exists on the store, create one and store it.
 * 3. Open modal and poll DOM until confirm button appears, then resolve the promise.
 */
