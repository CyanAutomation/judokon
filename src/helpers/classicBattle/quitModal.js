import { createModal } from "../../components/Modal.js";
import { createButton } from "../../components/Button.js";
import * as battleEngine from "../battleEngineFacade.js";
import { showResult } from "../battle/index.js";

function createQuitConfirmation(store, onConfirm) {
  const title = document.createElement("h2");
  title.id = "quit-modal-title";
  title.textContent = "Quit the match?";

  const desc = document.createElement("p");
  desc.id = "quit-modal-desc";
  desc.textContent = "Your progress will be lost.";

  const actions = document.createElement("div");
  actions.className = "modal-actions";

  const cancel = createButton("Cancel", {
    id: "cancel-quit-button",
    className: "secondary-button"
  });
  const quit = createButton("Quit", { id: "confirm-quit-button" });
  actions.append(cancel, quit);

  const frag = document.createDocumentFragment();
  frag.append(title, desc, actions);

  const modal = createModal(frag, { labelledBy: title, describedBy: desc });
  cancel.addEventListener("click", modal.close);
  quit.addEventListener("click", () => {
    onConfirm();
    modal.close();
    try {
      // Drive state machine to interruption path
      import("./orchestrator.js").then(({ dispatchBattleEvent }) => {
        dispatchBattleEvent("interrupt");
        dispatchBattleEvent("finalize");
      });
    } catch {}
    // In browsers, navigate to home; in jsdom, history.replaceState avoids Not Implemented errors
    try {
      window.location.href = "../../index.html";
    } catch {
      try {
        const target = new URL("../../index.html", window.location.href).href;
        if (typeof history !== "undefined" && typeof history.replaceState === "function") {
          history.replaceState(null, "", target);
        }
      } catch {}
    }
  });
  document.body.appendChild(modal.element);
  return modal;
}

/**
 * Trigger the Classic Battle quit confirmation modal.
 *
 * @pseudocode
 * 1. Create the modal if needed.
 * 2. Determine the element that opened the modal.
 * 3. Open the modal focusing the triggering element when available.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {HTMLElement} [trigger] - Element that initiated the quit action.
 */
export function quitMatch(store, trigger) {
  if (!store.quitModal) {
    store.quitModal = createQuitConfirmation(store, () => {
      const result = battleEngine.quitMatch();
      showResult(result.message);
    });
  }
  const fallback = document.getElementById("quit-match-button");
  store.quitModal.open(trigger ?? fallback ?? undefined);
}
