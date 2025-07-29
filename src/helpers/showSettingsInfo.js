/**
 * Display a modal describing a feature flag when toggled.
 *
 * @pseudocode
 * 1. Build title and description nodes from provided text.
 * 2. Create an OK button via `createButton`.
 * 3. Assemble modal with `createModal` and append to `document.body`.
 * 4. When the button is clicked, close and remove the modal.
 * 5. Open the modal immediately.
 */
import { createModal } from "../components/Modal.js";
import { createButton } from "../components/Button.js";

export function showSettingsInfo(label, description) {
  const title = document.createElement("h2");
  title.id = "settings-info-title";
  title.textContent = label;

  const desc = document.createElement("p");
  desc.id = "settings-info-desc";
  desc.textContent = description;

  const actions = document.createElement("div");
  actions.className = "modal-actions";
  const ok = createButton("OK", { id: "settings-info-ok" });
  actions.appendChild(ok);

  const frag = document.createDocumentFragment();
  frag.append(title, desc, actions);

  const modal = createModal(frag, { labelledBy: title, describedBy: desc });
  document.body.appendChild(modal.element);
  ok.addEventListener("click", () => {
    modal.close();
    modal.element.remove();
  });
  modal.open(ok);
  return modal;
}
