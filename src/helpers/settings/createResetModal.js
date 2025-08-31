import { createModal } from "../../components/Modal.js";
import { createButton } from "../../components/Button.js";
import { showSnackbar } from "../showSnackbar.js";

/**
 * Build a confirmation modal for restoring default settings.
 *
 * @pseudocode
 * 1. Create title and description nodes.
 * 2. Create Cancel and Yes buttons via `createButton`.
 * 3. Assemble modal with `createModal` and wire button handlers.
 *    - Cancel closes the modal.
 *    - Yes awaits `onConfirm`; on failure shows an error, otherwise closes.
 * 4. Append the modal element to `document.body`.
 * 5. Return the modal API.
 *
 * @param {Function} onConfirm - Called when user confirms reset.
 * @returns {{ open(trigger?: HTMLElement): void }} Modal controls.
 */
export function createResetModal(onConfirm) {
  const title = document.createElement("h2");
  title.id = "reset-modal-title";
  title.textContent = "Restore default settings?";

  const desc = document.createElement("p");
  desc.id = "reset-modal-desc";
  desc.textContent = "This will clear all saved preferences.";

  const actions = document.createElement("div");
  actions.className = "modal-actions";

  const cancel = createButton("Cancel", {
    id: "cancel-reset-button",
    className: "secondary-button"
  });
  const yes = createButton("Yes", { id: "confirm-reset-button" });
  actions.append(cancel, yes);

  const frag = document.createDocumentFragment();
  frag.append(title, desc, actions);

  const modal = createModal(frag, { labelledBy: title, describedBy: desc });
  cancel.addEventListener("click", () => modal.close());
  yes.addEventListener("click", async () => {
    try {
      await onConfirm();
      modal.close();
    } catch {
      showSnackbar("Failed to restore default settings");
    }
  });
  document.body.appendChild(modal.element);
  return modal;
}
