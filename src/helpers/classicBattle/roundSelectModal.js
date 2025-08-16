import { fetchJson } from "../dataUtils.js";
import { DATA_DIR, CLASSIC_BATTLE_POINTS_TO_WIN } from "../constants.js";
import { createButton } from "../../components/Button.js";
import { createModal } from "../../components/Modal.js";
import { setPointsToWin } from "../battleEngineFacade.js";
import { initTooltips } from "../tooltip.js";
import { isTestModeEnabled } from "../testModeUtils.js";

/**
 * Initialize round selection modal for Classic Battle.
 *
 * @pseudocode
 * 1. If test mode is enabled:
 *    a. Set `pointsToWin` to the default value.
 *    b. Invoke `onStart` and return early.
 * 2. Attempt to fetch `battleRounds.json` using `fetchJson`.
 *    a. On failure, log the error, fall back to default rounds, and note the load error.
 * 3. Create buttons for each option with `createButton` and assign tooltip ids.
 * 4. Assemble a modal via `createModal`, append an error note if needed, and attach to the document.
 * 5. Attempt to initialize tooltips for the modal; log errors but continue.
 * 6. Open the modal.
 * 7. When a button is clicked:
 *    a. Call `setPointsToWin` with the round value.
 *    b. Close the modal and invoke the provided start callback.
 *
 * @param {Function} onStart - Callback to invoke after selecting rounds.
 * @returns {Promise<void>} Resolves when modal is initialized.
 */
export async function initRoundSelectModal(onStart) {
  if (isTestModeEnabled()) {
    setPointsToWin(CLASSIC_BATTLE_POINTS_TO_WIN);
    if (typeof onStart === "function") await onStart();
    return;
  }

  let rounds;
  let loadError = false;
  try {
    rounds = await fetchJson(`${DATA_DIR}battleRounds.json`);
  } catch (err) {
    console.error("Failed to load battle rounds:", err);
    loadError = true;
    rounds = [
      { id: 1, label: "Quick", value: 5 },
      { id: 2, label: "Medium", value: 10 },
      { id: 3, label: "Long", value: 15 }
    ];
  }

  const title = document.createElement("h2");
  title.id = "round-select-title";
  title.textContent = "Select Match Length";

  const btnWrap = document.createElement("div");
  btnWrap.className = "round-select-buttons";

  const frag = document.createDocumentFragment();
  if (loadError) {
    const note = document.createElement("p");
    note.id = "round-select-error";
    note.textContent = "Failed to load match options. Using defaults.";
    frag.append(note);
  }
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
  try {
    await initTooltips(modal.element);
  } catch (err) {
    console.error("Failed to initialize tooltips:", err);
  }
  modal.open();
}
