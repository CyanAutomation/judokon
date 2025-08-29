import { createModal } from "../../components/Modal.js";
import { createButton } from "../../components/Button.js";
import * as battleEngine from "../battleEngineFacade.js";
import { showResult } from "../battle/index.js";
import { navigateToHome } from "../navUtils.js";
import { dispatchBattleEvent, getBattleState } from "./eventBus.js";
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
    onConfirm();
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

export let quitConfirmButtonPromise = Promise.resolve();

/**
 * Trigger the Classic Battle quit confirmation modal.
 *
 * @pseudocode
 * 1. Create the modal if needed.
 * 2. Determine the element that opened the modal.
 * 3. Open the modal focusing the triggering element when available.
 * 4. Resolve a promise with the confirm button once inserted.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {HTMLElement} [trigger] - Element that initiated the quit action.
 * @returns {Promise<HTMLButtonElement>} Resolves with the confirm button.
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
      showResult(result.message);
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
