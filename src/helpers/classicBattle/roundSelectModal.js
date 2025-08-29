import { fetchJson } from "../dataUtils.js";
import { DATA_DIR } from "../constants.js";
import { createButton } from "../../components/Button.js";
import { createModal } from "../../components/Modal.js";
import { setPointsToWin } from "../battleEngineFacade.js";
import { initTooltips } from "../tooltip.js";
import { isTestModeEnabled } from "../testModeUtils.js";
import { emitBattleEvent } from "./battleEvents.js";
import { wrap } from "../storage.js";
import { POINTS_TO_WIN_OPTIONS, DEFAULT_POINTS_TO_WIN } from "../../config/battleDefaults.js";
import { BATTLE_POINTS_TO_WIN } from "../../config/storageKeys.js";
import { logEvent } from "../telemetry.js";
import { t } from "../i18n.js";

/**
 * Initialize round selection modal for Classic Battle.
 *
 * @pseudocode
 * 1. If the page URL includes `autostart=1`:
 *    a. Set `pointsToWin` to the default value.
 *    b. Invoke `onStart` and return early.
 * 2. If test mode is enabled:
 *    a. Set `pointsToWin` to the default value.
 *    b. Invoke `onStart` and return early.
 * 3. Attempt to fetch `battleRounds.json` using `fetchJson`.
 *    a. On failure, log the error, fall back to default rounds, and note the load error.
 * 4. Create buttons for each option with `createButton` and assign tooltip ids.
 * 5. Assemble a modal via `createModal`, append an error note if needed, and attach to the document.
 * 6. Attempt to initialize tooltips for the modal; log errors but continue.
 * 7. Open the modal.
 * 8. When a button is clicked:
 *    a. Call `setPointsToWin` with the round value.
 *    b. Close and destroy the modal, then invoke the provided start callback.
 *
 * @param {Function} onStart - Callback to invoke after selecting rounds.
 * @returns {Promise<void>} Resolves when modal is initialized.
 */
export async function initRoundSelectModal(onStart) {
  // Allow automated test harnesses or debugging to bypass the modal by
  // supplying `?autostart=1` in the page URL. This is a deliberate, low-risk
  // convenience that mirrors existing `isTestModeEnabled()` behaviour.
  try {
    if (typeof location !== "undefined") {
      const params = new URLSearchParams(location.search);
      if (params.get("autostart") === "1") {
        setPointsToWin(DEFAULT_POINTS_TO_WIN);
        if (typeof onStart === "function") await onStart();
        return;
      }
    }
  } catch {}

  if (isTestModeEnabled()) {
    setPointsToWin(DEFAULT_POINTS_TO_WIN);
    if (typeof onStart === "function") await onStart();
    return;
  }

  // Persisted preference: if a prior selection exists, use it and skip modal
  try {
    const storage = wrap(BATTLE_POINTS_TO_WIN);
    const saved = storage.get();
    if (POINTS_TO_WIN_OPTIONS.includes(Number(saved))) {
      setPointsToWin(Number(saved));
      try {
        logEvent("battle.start", { pointsToWin: Number(saved), source: "storage" });
      } catch {}
      if (typeof onStart === "function") await onStart();
      return;
    }
  } catch {}

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
  title.textContent = t("modal.roundSelect.title");

  const btnWrap = document.createElement("div");
  btnWrap.className = "round-select-buttons";

  const frag = document.createDocumentFragment();
  if (loadError) {
    const note = document.createElement("p");
    note.id = "round-select-error";
    note.textContent = t("modal.roundSelect.error");
    frag.append(note);
  }
  frag.append(title, btnWrap);

  const modal = createModal(frag, { labelledBy: title });
  let cleanupTooltips = () => {};
  rounds.forEach((r) => {
    const btn = createButton(r.label, { id: `round-select-${r.id}` });
    btn.dataset.tooltipId = `ui.round${r.label}`;
    btn.addEventListener("click", () => {
      setPointsToWin(r.value);
      try {
        const storage = wrap(BATTLE_POINTS_TO_WIN);
        storage.set(r.value);
      } catch {}
      try {
        logEvent("battle.start", { pointsToWin: r.value, source: "modal" });
      } catch {}
      modal.close();
      if (typeof onStart === "function") onStart();
      cleanupTooltips();
      modal.destroy();
    });
    btnWrap.appendChild(btn);
  });

  document.body.appendChild(modal.element);
  try {
    cleanupTooltips = await initTooltips(modal.element);
  } catch (err) {
    console.error("Failed to initialize tooltips:", err);
  }
  modal.open();
  emitBattleEvent("roundOptionsReady");
}
