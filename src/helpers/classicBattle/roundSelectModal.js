import { fetchJson } from "../dataUtils.js";
import { DATA_DIR } from "../constants.js";
import { createButton } from "../../components/Button.js";
import { createModal } from "../../components/Modal.js";
import { setPointsToWin } from "../battleEngine.js";
import { initTooltips } from "../tooltip.js";

/**
 * Initialize round selection modal for Classic Battle.
 *
 * @pseudocode
 * 1. Fetch `battleRounds.json` using `fetchJson`.
 * 2. Create buttons for each option with `createButton` and assign tooltip ids.
 * 3. Assemble and open a modal via `createModal`.
 * 4. When a button is clicked:
 *    a. Call `setPointsToWin` with the round value.
 *    b. Close the modal and invoke the provided start callback.
 *
 * @param {Function} onStart - Callback to invoke after selecting rounds.
 * @returns {Promise<void>} Resolves when modal is initialized.
 */
export async function initRoundSelectModal(onStart) {
  let rounds;
  try {
    rounds = await fetchJson(`${DATA_DIR}battleRounds.json`);
  } catch (err) {
    console.error("Failed to load battle rounds:", err);
    if (typeof onStart === "function") onStart();
    return;
  }

  const title = document.createElement("h2");
  title.id = "round-select-title";
  title.textContent = "Select Match Length";

  const btnWrap = document.createElement("div");
  btnWrap.className = "round-select-buttons";

  const frag = document.createDocumentFragment();
  frag.append(title, btnWrap);

  const modal = createModal(frag, { labelledBy: title });
  rounds.forEach((r) => {
    const btn = createButton(r.label, { id: `round-select-${r.id}` });
    btn.dataset.tooltipId = `ui.round${r.label}`;
    btn.addEventListener("click", () => {
      setPointsToWin(r.value);
      modal.close();
      if (typeof onStart === "function") onStart();
    });
    btnWrap.appendChild(btn);
  });

  document.body.appendChild(modal.element);
  await initTooltips(modal.element);
  modal.open();
}
